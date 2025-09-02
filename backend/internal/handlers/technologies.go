package handlers

import (
	"archtool-backend/internal/db"
	"archtool-backend/internal/models"
	"archtool-backend/internal/utils"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"net/http"
	"strconv"
)

// =====================
//      ТЕХНОЛОГИИ
// =====================

// GET /api/technologies
func GetTechnologies(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Технология'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	type AttrRow struct {
		ObjectID string `db:"object_id"`
		AttrName string `db:"name"`
		Value    string `db:"value_text"`
	}

	var rows []AttrRow
	err = dbConn.Select(&rows, `
		SELECT av.object_id, a.name, av.value_text
		FROM attribute_values av
		JOIN attributes a ON av.attribute_id = a.id
		WHERE av.object_type_id = $1
		ORDER BY av.object_id`, objectTypeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Load error"})
		return
	}

	grouped := map[string]map[string]string{}
	for _, row := range rows {
		if _, exists := grouped[row.ObjectID]; !exists {
			grouped[row.ObjectID] = map[string]string{"id": row.ObjectID}
		}
		grouped[row.ObjectID][row.AttrName] = row.Value
	}

	var result []map[string]string
	for _, obj := range grouped {
		result = append(result, obj)
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/technologies/:id
func GetTechnologyByID(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	id := c.Param("id")

	type AttrRow struct {
		AttrName    string `db:"name"`
		DisplayName string `db:"display_name"`
		Value       string `db:"value_text"`
	}

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Технология'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	var rows []AttrRow
	err = dbConn.Select(&rows, `
		SELECT a.name, a.display_name, av.value_text
		FROM attribute_values av
		JOIN attributes a ON av.attribute_id = a.id
		WHERE av.object_type_id = $1 AND av.object_id = $2`, objectTypeID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Object not found"})
		return
	}

	result := map[string]interface{}{"id": id}
	for _, row := range rows {
		result[row.AttrName] = map[string]string{
			"displayName": row.DisplayName,
			"value":       row.Value,
		}
	}

	c.JSON(http.StatusOK, result)
}

// POST /api/technologies
func CreateTechnology(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	// используем ту же модель, что и для БС/приложений, т.к. формат совпадает
	var input models.CreateBusinessCapabilityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
		return
	}

	// генерим object_id
	var objectID string
	err = dbConn.Get(&objectID, `SELECT gen_random_uuid()`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID"})
		return
	}

	tx := dbConn.MustBegin()

	for _, attr := range input.Attributes {
		// подтянем метаданные атрибута
		var attrType string
		var isMultiple bool
		var options []string
		err := dbConn.QueryRowx(`
			SELECT type, COALESCE(is_multiple,false), COALESCE(options,'{}')
			FROM attributes WHERE id = $1`,
			attr.AttributeID).Scan(&attrType, &isMultiple, pq.Array(&options))
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут не найден", "attr_id": attr.AttributeID})
			return
		}

		// простая валидация по типу
		switch attrType {
		case "number":
			if _, err := strconv.ParseFloat(attr.Value, 64); err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Должно быть числом", "attr_id": attr.AttributeID})
				return
			}
		case "boolean":
			if attr.Value != "true" && attr.Value != "false" {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Должно быть true/false", "attr_id": attr.AttributeID})
				return
			}
		case "select":
			if isMultiple {
				var selected []string
				if err := json.Unmarshal([]byte(attr.Value), &selected); err != nil {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Невалидный JSON-массив для multiple select", "attr_id": attr.AttributeID})
					return
				}
				for _, val := range selected {
					if !utils.Contains(options, val) {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val})
						return
					}
				}
			} else {
				if !utils.Contains(options, attr.Value) {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + attr.Value})
					return
				}
			}
		}

		// сохраняем
		_, err = tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)`,
			input.ObjectTypeID, objectID, attr.AttributeID, attr.Value)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения атрибута"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TX commit failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": objectID})
}

// PUT /api/technologies/:id
func UpdateTechnology(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")

	// простая форма: { "НазваниеАтрибута": "значение", ... }
	var input map[string]string
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Технология'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	type Attr struct {
		ID         int      `db:"id"`
		Name       string   `db:"name"`
		Type       string   `db:"type"`
		IsMultiple bool     `db:"is_multiple"`
		Options    []string `db:"options"`
	}

	var attrs []Attr
	if err := dbConn.Select(&attrs, `
		SELECT id, name, type, COALESCE(is_multiple,false) AS is_multiple, COALESCE(options,'{}') AS options
		FROM attributes
		WHERE object_type_id = $1`, objectTypeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Load attributes failed"})
		return
	}

	// карта для быстрой проверки типов/опций
	attrByName := make(map[string]Attr, len(attrs))
	for _, a := range attrs {
		attrByName[a.Name] = a
	}

	tx := dbConn.MustBegin()
	for k, v := range input {
		a, ok := attrByName[k]
		if !ok {
			// неизвестный атрибут — пропускаем молча (или можно вернуть 400)
			continue
		}
		// валидация по типу
		switch a.Type {
		case "number":
			if _, err := strconv.ParseFloat(v, 64); err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Должно быть числом", "attr": k})
				return
			}
		case "boolean":
			if v != "true" && v != "false" {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Должно быть true/false", "attr": k})
				return
			}
		case "select":
			if a.IsMultiple {
				var selected []string
				if err := json.Unmarshal([]byte(v), &selected); err != nil {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Невалидный JSON-массив для multiple select", "attr": k})
					return
				}
				for _, val := range selected {
					if !utils.Contains(a.Options, val) {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val, "attr": k})
						return
					}
				}
			} else {
				if !utils.Contains(a.Options, v) {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + v, "attr": k})
					return
				}
			}
		}

		// upsert по (object_id, attribute_id)
		_, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (object_id, attribute_id)
			DO UPDATE SET value_text = EXCLUDED.value_text`,
			objectTypeID, objectID, a.ID, v)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TX commit failed"})
		return
	}

	c.JSON(http.StatusOK, input)
}

// DELETE /api/technologies/:id
func DeleteTechnology(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")
	_, err = dbConn.Exec(`DELETE FROM attribute_values WHERE object_id = $1`, objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
