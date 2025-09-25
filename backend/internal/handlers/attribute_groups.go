package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"archtool-backend/internal/models"
)

// GET /api/object_types/:objectTypeID/attribute_groups
func GetAttributeGroups(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		otID, err := strconv.Atoi(c.Param("id")) // в GetAttributeGroups
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid objectTypeID"})
			return
		}
		var groups []models.AttributeGroup
		if err := db.Select(&groups, `
			SELECT id, object_type_id, name, display_name, sort_order, is_collapsible
			FROM attribute_groups
			WHERE object_type_id=$1
			ORDER BY sort_order, id
		`, otID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		c.JSON(http.StatusOK, groups)
	}
}

type createGroupReq struct {
	Name          string `json:"name" binding:"required"`
	DisplayName   string `json:"display_name" binding:"required"`
	SortOrder     int    `json:"sort_order"`
	IsCollapsible bool   `json:"is_collapsible"`
}

// POST /api/object_types/:objectTypeID/attribute_groups
func CreateAttributeGroup(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		otID, err := strconv.Atoi(c.Param("id")) // в CreateAttributeGroup
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid objectTypeID"})
			return
		}
		var r createGroupReq
		if err := c.ShouldBindJSON(&r); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad payload"})
			return
		}
		var id int
		if err := db.QueryRow(`
			INSERT INTO attribute_groups(object_type_id, name, display_name, sort_order, is_collapsible)
			VALUES ($1,$2,$3,$4,$5) RETURNING id
		`, otID, r.Name, r.DisplayName, r.SortOrder, r.IsCollapsible).Scan(&id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"id": id})
	}
}

type updateGroupReq struct {
	Name          *string `json:"name"`
	DisplayName   *string `json:"display_name"`
	SortOrder     *int    `json:"sort_order"`
	IsCollapsible *bool   `json:"is_collapsible"`
}

// PUT /api/attribute_groups/:groupID
func UpdateAttributeGroup(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID, err := strconv.Atoi(c.Param("groupID"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid groupID"})
			return
		}
		var r updateGroupReq
		if err := c.ShouldBindJSON(&r); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad payload"})
			return
		}

		q := "UPDATE attribute_groups SET "
		args := []any{}
		comma := ""

		if r.Name != nil {
			q += comma + "name=$" + strconv.Itoa(len(args)+1)
			args = append(args, *r.Name)
			comma = ","
		}
		if r.DisplayName != nil {
			q += comma + "display_name=$" + strconv.Itoa(len(args)+1)
			args = append(args, *r.DisplayName)
			comma = ","
		}
		if r.SortOrder != nil {
			q += comma + "sort_order=$" + strconv.Itoa(len(args)+1)
			args = append(args, *r.SortOrder)
			comma = ","
		}
		if r.IsCollapsible != nil {
			q += comma + "is_collapsible=$" + strconv.Itoa(len(args)+1)
			args = append(args, *r.IsCollapsible)
			comma = ","
		}
		if len(args) == 0 {
			c.Status(http.StatusNoContent)
			return
		}
		q += " WHERE id=$" + strconv.Itoa(len(args)+1)
		args = append(args, groupID)

		if _, err := db.Exec(q, args...); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// DELETE /api/attribute_groups/:groupID
func DeleteAttributeGroup(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID, err := strconv.Atoi(c.Param("groupID"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid groupID"})
			return
		}
		// связи снимет ON DELETE SET NULL, но можно явно:
		if _, err := db.Exec(`UPDATE attributes SET group_id=NULL WHERE group_id=$1`, groupID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		if _, err := db.Exec(`DELETE FROM attribute_groups WHERE id=$1`, groupID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
