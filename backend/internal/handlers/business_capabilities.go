package handlers

import (
	"archtool-backend/internal/db"
	"archtool-backend/internal/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"fmt"
	"log"
)

// Получение всех бизнес-способностей (через attribute_values)
func GetBusinessCapabilities(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Бизнес-способность'`)
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

func GetBusinessCapabilityByID(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	objectID := c.Param("id")

	// Получаем object_type_id для "Бизнес-способность"
	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Бизнес-способность'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	// Получаем значения всех атрибутов для object_id
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

	// Ищем level и parent_id среди значений
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


func CreateBusinessCapability(c *gin.Context) {
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

	var objectID string
	err = dbConn.Get(&objectID, `SELECT gen_random_uuid()`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate ID"})
		return
	}

	tx := dbConn.MustBegin()

	for _, attr := range input.Attributes {
		var attrType string
		err := dbConn.QueryRowx(`SELECT type FROM attributes WHERE id = $1`, attr.AttributeID).Scan(&attrType)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут не найден или ошибка при получении", "attr_id": attr.AttributeID})
			return
		}

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
				c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут должен быть true или false", "attr_id": attr.AttributeID})
				return
			}
		case "string":
			// допустимо
		default:
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неизвестный тип атрибута", "attr_id": attr.AttributeID})
			return
		}

		_, err = tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
		`, input.ObjectTypeID, objectID, attr.AttributeID, attr.Value)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения атрибута", "attr_id": attr.AttributeID})
			return
		}
	}

	if input.ParentID != nil {
		_, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			SELECT $1, $2, id, $3 FROM attributes WHERE object_type_id = $1 AND name = 'parent_id'
		`, input.ObjectTypeID, objectID, *input.ParentID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert parent_id"})
			return
		}
	}

	if input.Level != "" {
		_, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			SELECT $1, $2, id, $3 FROM attributes WHERE object_type_id = $1 AND name = 'level'
		`, input.ObjectTypeID, objectID, input.Level)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert level"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"id": objectID})
}

func UpdateBusinessCapability(c *gin.Context) {
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

	fmt.Println("Входящий input:", input)

	// Преобразуем input["attributes"] в map[int]string
	attrsMap := map[int]string{}
	if rawAttrs, ok := input["attributes"].([]interface{}); ok {
		for _, raw := range rawAttrs {
			if m, ok := raw.(map[string]interface{}); ok {
				attrIDAny, hasID := m["attribute_id"]
				valAny, hasVal := m["value"]

				if hasID {
					attrID := int(attrIDAny.(float64)) // JSON числа — float64
					if hasVal && valAny != nil {
						attrsMap[attrID] = fmt.Sprintf("%v", valAny)
					} else {
						attrsMap[attrID] = "" // пустая строка вместо null
					}
				}
			}
		}
	}

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Бизнес-способность'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	tx := dbConn.MustBegin()
	for attrID, val := range attrsMap {
		fmt.Printf("Обновление: attr_id = %d, value = %s\n", attrID, val)

		_, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (object_id, attribute_id)
			DO UPDATE SET value_text = EXCLUDED.value_text
		`, objectTypeID, objectID, attrID, val)

		if err != nil {
			log.Println("Ошибка при вставке:", err)
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Println("Ошибка коммита:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func DeleteBusinessCapability(c *gin.Context) {
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
