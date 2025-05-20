package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"archtool-backend/internal/models"
)

// GET /api/object_types
func GetObjectTypes(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var types []models.ObjectType
		err := db.Select(&types, "SELECT * FROM object_types ORDER BY id")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения object types"})
			return
		}
		c.JSON(http.StatusOK, types)
	}
}

// GET /api/object_types/:id/attributes
func GetAttributesByObjectType(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectTypeID, _ := strconv.Atoi(c.Param("id"))
		var attrs []models.Attribute
		err := db.Select(&attrs, "SELECT * FROM attributes WHERE object_type_id = $1", objectTypeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения атрибутов"})
			return
		}
		c.JSON(http.StatusOK, attrs)
	}
}

// POST /api/object_types/:id/attributes
func CreateAttribute(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectTypeID, _ := strconv.Atoi(c.Param("id"))
		var attr models.Attribute
		if err := c.ShouldBindJSON(&attr); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
			return
		}

		query := `
INSERT INTO attributes (object_type_id, name, type, is_required, options, ref_object_type)
VALUES (:object_type_id, :name, :type, :is_required, :options, :ref_object_type)
RETURNING id`
		attr.ObjectTypeID = objectTypeID
		stmt, err := db.PrepareNamed(query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка подготовки запроса"})
			return
		}
		err = stmt.Get(&attr.ID, attr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка вставки атрибута"})
			return
		}

		c.JSON(http.StatusOK, attr)
	}
}
