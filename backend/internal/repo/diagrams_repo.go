package repo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"

	"archtool-backend/internal/models"
)

var (
	ErrNotFound = errors.New("diagram not found")
	ErrConflict = errors.New("version conflict")
)

type DiagramsRepo struct {
	DB *sqlx.DB
}

func NewDiagramsRepo(db *sqlx.DB) *DiagramsRepo {
	return &DiagramsRepo{DB: db}
}

type CreateDiagramParams struct {
	Name         string
	RegistryType *string
	XML          string
	OwnerID      *int64
}

func (r *DiagramsRepo) Create(ctx context.Context, p CreateDiagramParams) (*models.Diagram, error) {
	const q = `
		INSERT INTO diagrams (name, registry_type, xml, owner_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, registry_type, xml, owner_id, version, created_at, updated_at;
	`
	var d models.Diagram
	if err := r.DB.QueryRowxContext(ctx, q, p.Name, p.RegistryType, p.XML, p.OwnerID).StructScan(&d); err != nil {
		return nil, err
	}
	return &d, nil
}

type UpdateDiagramParams struct {
	ID             string
	Name           *string
	XML            *string
	ExpectedVersion *int // If-Match: оптимистичная блокировка (опционально)
	ModifiedBy     *int64
}

func (r *DiagramsRepo) GetByID(ctx context.Context, id string) (*models.Diagram, error) {
	const q = `
		SELECT id, name, registry_type, xml, owner_id, version, created_at, updated_at
		FROM diagrams WHERE id = $1;
	`
	var d models.Diagram
	if err := r.DB.GetContext(ctx, &d, q, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &d, nil
}

// List с фильтрами по владельцу и поиску по имени + пагинация
type ListParams struct {
	OwnerID *int64
	Q       *string
	Limit   int
	Offset  int
}

func (r *DiagramsRepo) List(ctx context.Context, p ListParams) ([]models.Diagram, int, error) {
	limit := p.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset := p.Offset
	if offset < 0 {
		offset = 0
	}

	conds := []string{"1=1"}
	args := []any{}
	if p.OwnerID != nil {
		args = append(args, *p.OwnerID)
		conds = append(conds, fmt.Sprintf("owner_id = $%d", len(args)))
	}
	if p.Q != nil && strings.TrimSpace(*p.Q) != "" {
		args = append(args, "%"+strings.TrimSpace(*p.Q)+"%")
		conds = append(conds, fmt.Sprintf("name ILIKE $%d", len(args)))
	}

	where := strings.Join(conds, " AND ")

	// count total
	var total int
	countQ := "SELECT COUNT(*) FROM diagrams WHERE " + where
	if err := r.DB.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, err
	}

	// page
	args = append(args, limit, offset)
	listQ := `
		SELECT id, name, registry_type, xml, owner_id, version, created_at, updated_at
		FROM diagrams
		WHERE ` + where + `
		ORDER BY updated_at DESC
		LIMIT $` + fmt.Sprint(len(args)-1) + ` OFFSET $` + fmt.Sprint(len(args)) + `;`

	var rows []models.Diagram
	if err := r.DB.SelectContext(ctx, &rows, listQ, args...); err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *DiagramsRepo) Update(ctx context.Context, p UpdateDiagramParams) (*models.Diagram, error) {
	tx, err := r.DB.BeginTxx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	// 1) читаем старую версию для истории
	const sel = `
		SELECT id, name, registry_type, xml, owner_id, version, created_at, updated_at
		FROM diagrams WHERE id = $1;
	`
	var old models.Diagram
	if err := tx.GetContext(ctx, &old, sel, p.ID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// проверка If-Match: версия должна совпасть
	if p.ExpectedVersion != nil && old.Version != *p.ExpectedVersion {
		return nil, ErrConflict
	}

	// 2) сохраняем снимок в историю (старая версия)
	const insVer = `
		INSERT INTO diagrams_versions (diagram_id, version, name, registry_type, xml, modified_by)
		VALUES ($1, $2, $3, $4, $5, $6);
	`
	if _, err := tx.ExecContext(ctx, insVer, old.ID, old.Version, old.Name, old.RegistryType, old.XML, p.ModifiedBy); err != nil {
		return nil, err
	}

	// 3) обновляем текущую запись и инкрементируем версию
	const upd = `
		UPDATE diagrams
		SET
			name = COALESCE($2, name),
			xml  = COALESCE($3, xml),
			updated_at = now(),
			version = version + 1
		WHERE id = $1
		  AND ($4::int IS NULL OR version = $4)
		RETURNING id, name, registry_type, xml, owner_id, version, created_at, updated_at;
	`
	var updated models.Diagram
	if err := tx.QueryRowxContext(ctx, upd, p.ID, p.Name, p.XML, p.ExpectedVersion).StructScan(&updated); err != nil {
		// если WHERE version не совпал — вернётся ErrNoRows
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrConflict
		}
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *DiagramsRepo) Delete(ctx context.Context, id string) error {
	const q = `DELETE FROM diagrams WHERE id = $1;`
	res, err := r.DB.ExecContext(ctx, q, id)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *DiagramsRepo) ListVersions(ctx context.Context, diagramID string, limit, offset int) ([]models.DiagramVersion, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	if err := r.DB.GetContext(ctx, &total, `SELECT COUNT(*) FROM diagrams_versions WHERE diagram_id = $1`, diagramID); err != nil {
		return nil, 0, err
	}

	var rows []models.DiagramVersion
	const q = `
		SELECT diagram_id, version, name, registry_type, xml, modified_by, created_at
		FROM diagrams_versions
		WHERE diagram_id = $1
		ORDER BY version DESC
		LIMIT $2 OFFSET $3;
	`
	if err := r.DB.SelectContext(ctx, &rows, q, diagramID, limit, offset); err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *DiagramsRepo) GetVersion(ctx context.Context, diagramID string, version int) (*models.DiagramVersion, error) {
	const q = `
		SELECT diagram_id, version, name, registry_type, xml, modified_by, created_at
		FROM diagrams_versions
		WHERE diagram_id = $1 AND version = $2;
	`
	var v models.DiagramVersion
	if err := r.DB.GetContext(ctx, &v, q, diagramID, version); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &v, nil
}
