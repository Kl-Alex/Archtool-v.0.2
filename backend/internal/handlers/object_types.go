package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"archtool-backend/internal/models"
	"github.com/lib/pq"


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

func GetAttributesByObjectType(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectTypeID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID типа объекта"})
			return
		}

		var attrs []models.Attribute
		err = db.Select(&attrs, `
			SELECT id, object_type_id, name, type
			FROM attributes
			WHERE object_type_id = $1
		`, objectTypeID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения атрибутов"})
			return
		}

		c.JSON(http.StatusOK, attrs)
	}
}


type CreateAttributeInput struct {
	Name            string   `json:"name"`
	Type            string   `json:"type"`
	IsRequired      bool     `json:"is_required"`
	Options         []string `json:"options"`
	RefObjectTypeID *int     `json:"ref_object_type"`
}

func CreateAttribute(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectTypeID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный object_type_id"})
			return
		}

		var input CreateAttributeInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный JSON", "details": err.Error()})
			return
		}

		if input.Name == "" || input.Type == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Имя и тип обязательны"})
			return
		}

		// Преобразуем []string → pq.StringArray
		_, err = db.Exec(`
			INSERT INTO attributes (object_type_id, name, type, is_required, options, ref_object_type)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, objectTypeID, input.Name, input.Type, input.IsRequired, pq.StringArray(input.Options), input.RefObjectTypeID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания атрибута", "details": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Атрибут успешно добавлен"})
	}
}

// DELETE /api/attributes/:id — удаление атрибута по ID
func DeleteAttribute(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attrID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID атрибута"})
			return
		}

		_, err = db.Exec(`DELETE FROM attributes WHERE id = $1`, attrID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления атрибута"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Атрибут удалён"})
	}
}
