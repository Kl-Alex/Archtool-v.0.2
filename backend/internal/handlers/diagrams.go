package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"archtool-backend/internal/db"
	"archtool-backend/internal/repo"
)

type DiagramsHandler struct{}

func NewDiagramsHandler() *DiagramsHandler { return &DiagramsHandler{} }

// ===== helpers =====

func getDB(c *gin.Context) (*sqlx.DB, error) {
	return db.Connect()
}

func getUserIDPtr(c *gin.Context) *int64 {
	if val, ok := c.Get("userID"); ok {
		if id, ok2 := val.(int64); ok2 {
			return &id
		}
	}
	return nil
}

func defaultIfEmpty(s, d string) string {
	if s == "" {
		return d
	}
	return s
}

func parseIfMatchVersion(h string) (*int, bool) {
	h = strings.TrimSpace(h)
	if h == "" {
		return nil, false
	}
	// поддерживаем форматы: 5, "5", W/"5"
	h = strings.TrimPrefix(h, `W/`)
	h = strings.Trim(h, `"`)
	v, err := strconv.Atoi(h)
	if err != nil {
		return nil, false
	}
	return &v, true
}

// ===== handlers =====

// POST /api/diagrams
func (h *DiagramsHandler) CreateDiagram(c *gin.Context) {
	type req struct {
		Name         string  `json:"name" binding:"required"`
		RegistryType *string `json:"registry_type"`
		XML          string  `json:"xml" binding:"required"`
	}
	var in req
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	out, err := r.Create(c, repo.CreateDiagramParams{
		Name:         in.Name,
		RegistryType: in.RegistryType,
		XML:          in.XML,
		OwnerID:      getUserIDPtr(c),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create failed"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// PUT /api/diagrams/:id
// Оптимистичная блокировка через If-Match: <version> (или W/"<version>")
func (h *DiagramsHandler) UpdateDiagram(c *gin.Context) {
	id := c.Param("id")
	type req struct {
		Name *string `json:"name"`
		XML  *string `json:"xml"`
	}
	var in req
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	var expectedVersion *int
	if hdr := c.GetHeader("If-Match"); hdr != "" {
		if v, ok := parseIfMatchVersion(hdr); ok {
			expectedVersion = v
		}
	}

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	out, err := r.Update(c, repo.UpdateDiagramParams{
		ID:              id,
		Name:            in.Name,
		XML:             in.XML,
		ExpectedVersion: expectedVersion,
		ModifiedBy:      getUserIDPtr(c),
	})
	if err != nil {
		switch err {
		case repo.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		case repo.ErrConflict:
			c.JSON(http.StatusConflict, gin.H{"error": "version conflict"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
			return
		}
	}
	c.JSON(http.StatusOK, out)
}

// GET /api/diagrams/:id
func (h *DiagramsHandler) GetDiagram(c *gin.Context) {
	id := c.Param("id")

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	out, err := r.GetByID(c, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "get failed"})
		return
	}
	// по желанию можно выставлять ETag: версия
	if out.Version > 0 {
		c.Header("ETag", strconv.Itoa(out.Version))
	}
	c.JSON(http.StatusOK, out)
}

// GET /api/diagrams?q=&owner_id=&limit=&offset=
func (h *DiagramsHandler) ListDiagrams(c *gin.Context) {
	var (
		qStr   *string
		owner  *int64
		limit  = 50
		offset = 0
	)
	if q := c.Query("q"); q != "" {
		qStr = &q
	}
	if s := c.Query("owner_id"); s != "" {
		if v, err := strconv.ParseInt(s, 10, 64); err == nil {
			owner = &v
		}
	}
	if s := c.Query("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			limit = v
		}
	}
	if s := c.Query("offset"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			offset = v
		}
	}

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	rows, total, err := r.List(c, repo.ListParams{
		OwnerID: owner, Q: qStr, Limit: limit, Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items": rows,
		"total": total,
	})
}

// DELETE /api/diagrams/:id
func (h *DiagramsHandler) DeleteDiagram(c *gin.Context) {
	id := c.Param("id")

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	if err := r.Delete(c, id); err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /api/diagrams/:id/versions
func (h *DiagramsHandler) ListVersions(c *gin.Context) {
	id := c.Param("id")
	limit, _ := strconv.Atoi(defaultIfEmpty(c.Query("limit"), "50"))
	offset, _ := strconv.Atoi(defaultIfEmpty(c.Query("offset"), "0"))

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	rows, total, err := r.ListVersions(c, id, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list versions failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": rows, "total": total})
}

// GET /api/diagrams/:id/versions/:version
func (h *DiagramsHandler) GetVersion(c *gin.Context) {
	id := c.Param("id")
	v, err := strconv.Atoi(c.Param("version"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version"})
		return
	}

	dbConn, err := getDB(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	defer dbConn.Close()

	r := repo.NewDiagramsRepo(dbConn)
	row, err := r.GetVersion(c, id, v)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "get version failed"})
		return
	}
	c.JSON(http.StatusOK, row)
}
