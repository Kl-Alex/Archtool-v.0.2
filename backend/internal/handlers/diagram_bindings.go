package handlers

import (
	"net/http"

	"archtool-backend/internal/db"
	"archtool-backend/internal/repo"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type DiagramBindingsHandler struct{}

func NewDiagramBindingsHandler() *DiagramBindingsHandler { return &DiagramBindingsHandler{} }

// локальные хелперы — такие же, как в других твоих файлах
func getDBx(c *gin.Context) (*sqlx.DB, error) { return db.Connect() }
func getUID(c *gin.Context) *int64 {
	if v, ok := c.Get("userID"); ok {
		if id, ok := v.(int64); ok {
			return &id
		}
	}
	return nil
}

// POST /api/diagrams/:id/bindings
// body: { "cell_id": "...", "object_type": "business_capability", "object_id": "<uuid|id as string>" }
func (h *DiagramBindingsHandler) CreateBinding(c *gin.Context) {
	diagramID := c.Param("id") // uuid строкой из маршрута

	type req struct {
		CellID     string `json:"cell_id" binding:"required"`
		ObjectType string `json:"object_type" binding:"required"`
		ObjectID   string `json:"object_id" binding:"required"` // строка — поддерживает и UUID, и числовые
	}
	var in req
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	dbConn, err := getDBx(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramBindingsRepo(dbConn)

	// Upsert — реализован в репозитории (ON CONFLICT (diagram_id, cell_id) DO UPDATE ...)
	out, err := r.Create(c, repo.CreateBindingParams{
		DiagramID:  diagramID,
		CellID:     in.CellID,
		ObjectType: in.ObjectType,
		ObjectID:   in.ObjectID,
		CreatedBy:  getUID(c),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create failed"})
		return
	}

	c.JSON(http.StatusCreated, out)
}

// GET /api/diagrams/:id/bindings?cell_id=...
func (h *DiagramBindingsHandler) GetBindingByCell(c *gin.Context) {
	diagramID := c.Param("id")
	cellID := c.Query("cell_id")
	if cellID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cell_id required"})
		return
	}

	dbConn, err := getDBx(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramBindingsRepo(dbConn)
	row, err := r.GetByCell(c, diagramID, cellID)
	if err != nil {
		if err == repo.ErrBindingNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "get failed"})
		return
	}

	c.JSON(http.StatusOK, row)
}

// DELETE /api/diagrams/:id/bindings?cell_id=...
func (h *DiagramBindingsHandler) DeleteBindingByCell(c *gin.Context) {
	diagramID := c.Param("id")
	cellID := c.Query("cell_id")
	if cellID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cell_id required"})
		return
	}

	dbConn, err := getDBx(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramBindingsRepo(dbConn)

	// В репозитории DeleteByCell возвращает (rowsAffected, error).
	rows, err := r.DeleteByCell(c, diagramID, cellID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}

	// Если rows == 0 — привязки не было; трактуем как "ок, ничего удалять".
	_ = rows
	c.Status(http.StatusNoContent)
}
