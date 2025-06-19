package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"archtool-backend/internal/models"
		"archtool-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
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

// GET /api/object_types/:id/attributes
func GetAttributesByObjectType(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectTypeID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID типа объекта"})
			return
		}

		var attrs []models.Attribute
		err = db.Select(&attrs, `
			SELECT 
				id, object_type_id, name, display_name, type, is_required, is_multiple, options::text[], dictionary_name
			FROM attributes
			WHERE object_type_id = $1
		`, objectTypeID)

		if err != nil {
			log.Println("Ошибка получения атрибутов:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения атрибутов"})
			return
		}

		// Если указан dictionary_name, заменим options
		for i := range attrs {
			if attrs[i].DictionaryName.Valid {
				var refOptions []string
				err := db.Select(&refOptions, `
					SELECT value FROM reference_data 
					WHERE dictionary_name = $1 ORDER BY value
				`, attrs[i].DictionaryName.String)

				if err != nil {
					log.Printf("Ошибка получения справочника '%s': %v", attrs[i].DictionaryName.String, err)
					continue
				}

				attrs[i].Options = refOptions
			}
		}

		c.JSON(http.StatusOK, attrs)
	}
}


// POST /api/object_types/:id/attributes
type CreateAttributeInput struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"display_name"`
	Type        string   `json:"type"`
	IsRequired  bool     `json:"is_required"`
	IsMultiple  bool     `json:"is_multiple"`
	Options     []string `json:"options"`
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
			INSERT INTO attributes (object_type_id, name, display_name, type, is_required, is_multiple, options)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, objectTypeID, input.Name, input.DisplayName, input.Type, input.IsRequired, input.IsMultiple, pq.Array(input.Options))

		if err != nil {
			log.Println("Ошибка создания атрибута:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания атрибута", "details": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Атрибут успешно добавлен"})
	}
}

// DELETE /api/attributes/:id
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

// PUT /api/objects/:object_id/attributes/:attribute_id
type SetAttributeValueInput struct {
	Value string `json:"value"`
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

		// Получаем тип, is_multiple и options
		var attrType string
		var isMultiple bool
		var options []string
err = db.QueryRow(`
	SELECT type, is_multiple, options::text[]
	FROM attributes
	WHERE id = $1
`, attrID).Scan(&attrType, &isMultiple, pq.Array(&options))



		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось получить тип атрибута"})
			return
		}

		// Валидация
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
		case "select":
			if isMultiple {
				var selected []string
				if err := json.Unmarshal([]byte(input.Value), &selected); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Должен быть JSON-массив строк"})
					return
				}
				for _, val := range selected {
					if !utils.Contains(options, val) {
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val})
						return
					}
				}
			} else {
				if !utils.Contains(options, input.Value) {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + input.Value})
					return
				}
			}
		case "string":
			// допустимо
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неизвестный тип атрибута"})
			return
		}

		// Сохраняем
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