package handlers

import (
	"archtool-backend/internal/db"
	"archtool-backend/internal/models"
	"archtool-backend/internal/utils"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// =====================
//       ПЛАТФОРМЫ
// =====================

// GET /api/platforms
func GetPlatforms(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	var objectTypeID int
	if err := dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Платформа'`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	type AttrRow struct {
		ObjectID string `db:"object_id"`
		AttrName string `db:"name"`
		Value    string `db:"value_text"`
	}

	var rows []AttrRow
	if err := dbConn.Select(&rows, `
		SELECT av.object_id, a.name, av.value_text
		FROM attribute_values av
		JOIN attributes a ON av.attribute_id = a.id
		WHERE av.object_type_id = $1
		ORDER BY av.object_id
	`, objectTypeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Load error"})
		return
	}

	grouped := map[string]map[string]string{}
	for _, row := range rows {
		if _, ok := grouped[row.ObjectID]; !ok {
			grouped[row.ObjectID] = map[string]string{"id": row.ObjectID}
		}
		grouped[row.ObjectID][row.AttrName] = row.Value
	}

	result := make([]map[string]string, 0, len(grouped))
	for _, obj := range grouped {
		result = append(result, obj)
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/platforms/:id
func GetPlatformByID(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	id := c.Param("id")

	var objectTypeID int
	if err := dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Платформа'`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	type AttrRow struct {
		AttrID      int    `db:"id"`
		AttrName    string `db:"name"`
		DisplayName string `db:"display_name"`
		Value       string `db:"value_text"`
	}

	var rows []AttrRow
	if err := dbConn.Select(&rows, `
		SELECT a.id, a.name, a.display_name, av.value_text
		FROM attribute_values av
		JOIN attributes a ON av.attribute_id = a.id
		WHERE av.object_type_id = $1 AND av.object_id = $2
	`, objectTypeID, id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Object not found"})
		return
	}

	resp := map[string]interface{}{
		"id":         id,
		"attributes": []map[string]interface{}{},
	}
	attrList := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		attrList = append(attrList, map[string]interface{}{
			"attribute_id": r.AttrID,
			"name":         r.AttrName,
			"display_name": r.DisplayName,
			"value_text":   r.Value,
		})
	}
	resp["attributes"] = attrList

	c.JSON(http.StatusOK, resp)
}

// POST /api/platforms
func CreatePlatform(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	var input models.CreateBusinessCapabilityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
		return
	}

	var platformTypeID int
	if err := dbConn.Get(&platformTypeID, `SELECT id FROM object_types WHERE name = 'Платформа'`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	var objectID string
	if err := dbConn.Get(&objectID, `SELECT gen_random_uuid()`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID"})
		return
	}

	tx := dbConn.MustBegin()

	for _, attr := range input.Attributes {
		var attrType string
		var isMultiple bool
		var options []string
		var dictName sql.NullString

		if err := dbConn.QueryRowx(`
			SELECT type, COALESCE(is_multiple,false), COALESCE(options,'{}'), dictionary_name
			FROM attributes
			WHERE id = $1 AND object_type_id = $2
		`, attr.AttributeID, platformTypeID).Scan(&attrType, &isMultiple, pq.Array(&options), &dictName); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут не найден", "attr_id": attr.AttributeID})
			return
		}

		// Валидация
		switch attrType {
		case "number":
			if _, err := strconv.ParseFloat(attr.Value, 64); err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут должен быть числом", "attr_id": attr.AttributeID})
				return
			}
		case "boolean":
			if attr.Value != "true" && attr.Value != "false" {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут должен быть true/false", "attr_id": attr.AttributeID})
				return
			}
		case "date":
			if !isValidDate(attr.Value) {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты", "attr_id": attr.AttributeID, "value": attr.Value})
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
				for _, v := range selected {
					if dictName.Valid {
						var cnt int
						if err := dbConn.Get(&cnt, `
							SELECT COUNT(*) FROM reference_data WHERE dictionary_name = $1 AND value = $2
						`, dictName.String, v); err != nil || cnt == 0 {
							tx.Rollback()
							c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение из справочника: " + v, "attr_id": attr.AttributeID})
							return
						}
					} else if !utils.Contains(options, v) {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + v, "attr_id": attr.AttributeID})
						return
					}
				}
			} else {
				val := attr.Value
				if dictName.Valid {
					var cnt int
					if err := dbConn.Get(&cnt, `
						SELECT COUNT(*) FROM reference_data WHERE dictionary_name = $1 AND value = $2
					`, dictName.String, val); err != nil || cnt == 0 {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение из справочника: " + val, "attr_id": attr.AttributeID})
						return
					}
				} else if !utils.Contains(options, val) {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val, "attr_id": attr.AttributeID})
					return
				}
			}
		}

		if _, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
		`, platformTypeID, objectID, attr.AttributeID, attr.Value); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения атрибута", "attr_id": attr.AttributeID})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TX commit failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": objectID})
}

// PUT /api/platforms/:id
func UpdatePlatform(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	var platformTypeID int
	if err := dbConn.Get(&platformTypeID, `SELECT id FROM object_types WHERE name = 'Платформа'`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	type pair struct {
		ID    int
		Value string
	}
	pairs := make([]pair, 0)

	if rawArr, ok := input["attributes"].([]interface{}); ok {
		for _, raw := range rawArr {
			if m, ok := raw.(map[string]interface{}); ok {
				aID, hasID := m["attribute_id"]
				val, hasVal := m["value"]
				if !hasID {
					continue
				}
				id := intFromAny(aID)
				v := ""
				if hasVal && val != nil {
					v = toString(val)
				}
				if id > 0 {
					pairs = append(pairs, pair{ID: id, Value: v})
				}
			}
		}
	}

	if len(pairs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No attributes to update"})
		return
	}

	tx := dbConn.MustBegin()

	for _, p := range pairs {
		var attrType string
		var isMultiple bool
		var options []string
		var dictName sql.NullString

		if err := dbConn.QueryRowx(`
			SELECT type, COALESCE(is_multiple,false), COALESCE(options,'{}'), dictionary_name
			FROM attributes
			WHERE id = $1 AND object_type_id = $2
		`, p.ID, platformTypeID).Scan(&attrType, &isMultiple, pq.Array(&options), &dictName); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут не найден", "attr_id": p.ID})
			return
		}

		switch attrType {
		case "number":
			if _, err := strconv.ParseFloat(p.Value, 64); err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут должен быть числом", "attr_id": p.ID})
				return
			}
		case "boolean":
			if p.Value != "true" && p.Value != "false" {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут должен быть true/false", "attr_id": p.ID})
				return
			}
		case "date":
			if !isValidDate(p.Value) {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты", "attr_id": p.ID, "value": p.Value})
				return
			}
		case "select":
			if isMultiple {
				var selected []string
				if err := json.Unmarshal([]byte(p.Value), &selected); err != nil {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Невалидный JSON-массив для multiple select", "attr_id": p.ID})
					return
				}
				for _, v := range selected {
					if dictName.Valid {
						var cnt int
						if err := dbConn.Get(&cnt, `
							SELECT COUNT(*) FROM reference_data WHERE dictionary_name = $1 AND value = $2
						`, dictName.String, v); err != nil || cnt == 0 {
							tx.Rollback()
							c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение из справочника: " + v, "attr_id": p.ID})
							return
						}
					} else if !utils.Contains(options, v) {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + v, "attr_id": p.ID})
						return
					}
				}
			} else {
				val := p.Value
				if dictName.Valid {
					var cnt int
					if err := dbConn.Get(&cnt, `
						SELECT COUNT(*) FROM reference_data WHERE dictionary_name = $1 AND value = $2
					`, dictName.String, val); err != nil || cnt == 0 {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение из справочника: " + val, "attr_id": p.ID})
						return
					}
				} else if !utils.Contains(options, val) {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val, "attr_id": p.ID})
					return
				}
			}
		}

		if _, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (object_id, attribute_id)
			DO UPDATE SET value_text = EXCLUDED.value_text
		`, platformTypeID, objectID, p.ID, p.Value); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed", "attr_id": p.ID})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "TX commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// DELETE /api/platforms/:id
func DeletePlatform(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")
	if _, err := dbConn.Exec(`DELETE FROM attribute_values WHERE object_id = $1`, objectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
