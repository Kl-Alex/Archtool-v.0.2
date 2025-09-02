package repo

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

var (
	// Можно переиспользовать sql.ErrNoRows как "не найдено"
	ErrBindingNotFound = sql.ErrNoRows
)

type DiagramBinding struct {
	ID         int64  `db:"id"          json:"id"`
	DiagramID  string `db:"diagram_id"  json:"diagram_id"`  // uuid
	CellID     string `db:"cell_id"     json:"cell_id"`
	ObjectType string `db:"object_type" json:"object_type"`
	ObjectID   string  `db:"object_id"   json:"object_id"`
}

type DiagramBindingsRepo struct {
	db *sqlx.DB
}

func NewDiagramBindingsRepo(db *sqlx.DB) *DiagramBindingsRepo { return &DiagramBindingsRepo{db: db} }

type CreateBindingParams struct {
	DiagramID  string // uuid
	CellID     string
	ObjectType string
	ObjectID   string
	CreatedBy  *int64
}

// Create — создаёт привязку. Уникальность (diagram_id, cell_id) обеспечивается на уровне БД.
func (r *DiagramBindingsRepo) Create(ctx context.Context, p CreateBindingParams) (*DiagramBinding, error) {
    var out DiagramBinding
    const q = `
        INSERT INTO diagram_bindings (diagram_id, cell_id, object_type, object_id, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (diagram_id, cell_id)
        DO UPDATE SET
            object_type = EXCLUDED.object_type,
            object_id   = EXCLUDED.object_id,
            created_by  = EXCLUDED.created_by
        RETURNING id, diagram_id, cell_id, object_type, object_id
    `
    if err := r.db.GetContext(ctx, &out, q, p.DiagramID, p.CellID, p.ObjectType, p.ObjectID, p.CreatedBy); err != nil {
        return nil, err
    }
    return &out, nil
}


// GetByCell — получить привязку по паре (diagram_id, cell_id).
func (r *DiagramBindingsRepo) GetByCell(ctx context.Context, diagramID string, cellID string) (*DiagramBinding, error) {
	var out DiagramBinding
	const q = `
		SELECT id, diagram_id, cell_id, object_type, object_id
		FROM diagram_bindings
		WHERE diagram_id = $1 AND cell_id = $2
	`
	if err := r.db.GetContext(ctx, &out, q, diagramID, cellID); err != nil {
		return nil, err
	}
	return &out, nil
}

// было: func (r *DiagramBindingsRepo) DeleteByCell(ctx context.Context, diagramID string, cellID string) error
func (r *DiagramBindingsRepo) DeleteByCell(ctx context.Context, diagramID string, cellID string) (int64, error) {
	const q = `DELETE FROM diagram_bindings WHERE diagram_id = $1 AND cell_id = $2`
	res, err := r.db.ExecContext(ctx, q, diagramID, cellID)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return n, nil
}


// (опционально) Delete — удалить привязку по первичному ключу.
func (r *DiagramBindingsRepo) Delete(ctx context.Context, id int64) error {
	const q = `DELETE FROM diagram_bindings WHERE id = $1`
	_, err := r.db.ExecContext(ctx, q, id)
	return err
}
