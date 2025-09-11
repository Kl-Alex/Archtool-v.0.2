package handlers

import (
	"archtool-backend/internal/db"
	"archtool-backend/internal/models"
	"archtool-backend/internal/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"log"
	"net/http"
	"regexp"
	"strconv"
)

// ================ СПОСОБНОСТИ ПРИЛОЖЕНИЙ =================

// GET /api/app_capabilities
func GetAppCapabilities(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Способность приложения'`)
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

// GET /api/app_capabilities/:id
func GetAppCapabilityByID(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Способность приложения'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	type AttributeRow struct {
		AttributeID int    `db:"attribute_id" json:"attribute_id"`
		Name        string `db:"name" json:"name"`
		Value       string `db:"value_text" json:"value_text"`
	}
	var attrs []AttributeRow
	err = dbConn.Select(&attrs, `
		SELECT av.attribute_id, a.name, av.value_text
		FROM attribute_values av
		JOIN attributes a ON av.attribute_id = a.id
		WHERE av.object_type_id = $1 AND av.object_id = $2
	`, objectTypeID, objectID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load attribute values"})
		return
	}

	var level, parentID *string
	for _, attr := range attrs {
		switch attr.Name {
		case "level":
			lv := attr.Value
			level = &lv
		case "parent_id":
			pid := attr.Value
			parentID = &pid
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         objectID,
		"level":      level,
		"parent_id":  parentID,
		"attributes": attrs,
	})
}

// POST /api/app_capabilities
func CreateAppCapability(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	var input models.CreateBusinessCapabilityInput // структура та же
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
		return
	}

	var objectID string
	err = dbConn.Get(&objectID, `SELECT gen_random_uuid()`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID"})
		return
	}

	tx := dbConn.MustBegin()

	for _, attr := range input.Attributes {
		var attrType string
		var isMultiple bool
		var options []string
		var dictName sql.NullString

		err := dbConn.QueryRowx(`
			SELECT type, is_multiple, options, dictionary_name 
			FROM attributes 
			WHERE id = $1
		`, attr.AttributeID).Scan(&attrType, &isMultiple, pq.Array(&options), &dictName)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут не найден", "attr_id": attr.AttributeID})
			return
		}

		// валидация по типам — как в бизнес-способностях
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
			patterns := []string{
				`^\d{2}\.\d{2}\.\d{4}$`,
				`^\d{2}\.\d{4}$`,
				`^q[1-4]\.\d{4}$`,
				`^\d{4}$`,
			}
			valid := false
			for _, pat := range patterns {
				if ok, _ := regexp.MatchString(pat, attr.Value); ok {
					valid = true
					break
				}
			}
			if !valid {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты", "attr_id": attr.AttributeID})
				return
			}
		case "select":
			if isMultiple {
				var selected []string
				if err := json.Unmarshal([]byte(attr.Value), &selected); err != nil {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Невалидный JSON-массив", "attr_id": attr.AttributeID})
					return
				}
				for _, val := range selected {
					if dictName.Valid {
						var count int
						err := dbConn.Get(&count, `
							SELECT COUNT(*) FROM reference_data 
							WHERE dictionary_name = $1 AND value = $2
						`, dictName.String, val)
						if err != nil || count == 0 {
							tx.Rollback()
							c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val})
							return
						}
					} else if !utils.Contains(options, val) {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + val})
						return
					}
				}
			} else {
				if dictName.Valid {
					var count int
					err := dbConn.Get(&count, `
						SELECT COUNT(*) FROM reference_data 
						WHERE dictionary_name = $1 AND value = $2
					`, dictName.String, attr.Value)
					if err != nil || count == 0 {
						tx.Rollback()
						c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + attr.Value})
						return
					}
				} else if !utils.Contains(options, attr.Value) {
					tx.Rollback()
					c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + attr.Value})
					return
				}
			}
		}

		_, err = tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
		`, input.ObjectTypeID, objectID, attr.AttributeID, attr.Value)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения атрибута"})
			return
		}
	}

	// сохраняем служебные parent_id/level
	if input.ParentID != nil {
		_, _ = tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			SELECT $1, $2, id, $3 FROM attributes WHERE object_type_id=$1 AND name='parent_id'
		`, input.ObjectTypeID, objectID, *input.ParentID)
	}
	if input.Level != "" {
		_, _ = tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			SELECT $1, $2, id, $3 FROM attributes WHERE object_type_id=$1 AND name='level'
		`, input.ObjectTypeID, objectID, input.Level)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": objectID})
}

// PUT /api/app_capabilities/:id (универсальный)
func UpdateAppCapability(c *gin.Context) {
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

	attrsMap := map[int]string{}
	if rawAttrs, ok := input["attributes"].([]interface{}); ok {
		for _, raw := range rawAttrs {
			if m, ok := raw.(map[string]interface{}); ok {
				if idAny, ok := m["attribute_id"]; ok {
					val := ""
					if v, has := m["value"]; has && v != nil {
						val = fmt.Sprintf("%v", v)
					}
					attrsMap[int(idAny.(float64))] = val
				}
			}
		}
	}

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Способность приложения'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	tx := dbConn.MustBegin()
	for attrID, val := range attrsMap {
		_, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1,$2,$3,$4)
			ON CONFLICT (object_id, attribute_id)
			DO UPDATE SET value_text=EXCLUDED.value_text
		`, objectTypeID, objectID, attrID, val)
		if err != nil {
			log.Println("Ошибка при вставке:", err)
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
			return
		}
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// DELETE /api/app_capabilities/:id
func DeleteAppCapability(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")
	_, err = dbConn.Exec(`DELETE FROM attribute_values WHERE object_id=$1`, objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
