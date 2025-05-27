package handlers

import (
	"net/http"
	"strconv"
	"log"

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

func GetAttributesByObjectType(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectTypeID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID типа объекта"})
			return
		}

		var attrs []models.Attribute
		err = db.Select(&attrs, `
			SELECT id, object_type_id, name, display_name, type, is_required
			FROM attributes
			WHERE object_type_id = $1
		`, objectTypeID)

		if err != nil {
			log.Println("Ошибка получения атрибутов:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения атрибутов"})
			return
		}

		c.JSON(http.StatusOK, attrs)
	}
}

type CreateAttributeInput struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Type        string `json:"type"`
	IsRequired  bool   `json:"is_required"`
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

		_, err = db.Exec(`
			INSERT INTO attributes (object_type_id, name, display_name, type, is_required)
			VALUES ($1, $2, $3, $4, $5)
		`, objectTypeID, input.Name, input.DisplayName, input.Type, input.IsRequired)

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

type SetAttributeValueInput struct {
	Value string `json:"value"` // всегда строка из JSON — будем кастовать
}

func SetAttributeValue(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectID := c.Param("object_id")
		attrID, err := strconv.Atoi(c.Param("attribute_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный attribute_id"})
			return
		}

		var input SetAttributeValueInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный JSON", "details": err.Error()})
			return
		}

		// 1. Получаем тип атрибута
		var attrType string
		err = db.Get(&attrType, "SELECT type FROM attributes WHERE id = $1", attrID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось получить тип атрибута"})
			return
		}

		// 2. Валидация
		switch attrType {
		case "number":
			if _, err := strconv.ParseFloat(input.Value, 64); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Значение должно быть числом"})
				return
			}
		case "boolean":
			if input.Value != "true" && input.Value != "false" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Значение должно быть true или false"})
				return
			}
		case "string":
			// always valid
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неизвестный тип атрибута"})
			return
		}

		// 3. Сохраняем
		_, err = db.Exec(`
			INSERT INTO attribute_values (object_id, attribute_id, object_type_id, value_text)
			VALUES ($1, $2, (SELECT object_type_id FROM attributes WHERE id = $2), $3)
			ON CONFLICT (object_id, attribute_id)
			DO UPDATE SET value_text = EXCLUDED.value_text
		`, objectID, attrID, input.Value)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения значения", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Значение успешно сохранено"})
	}
}
