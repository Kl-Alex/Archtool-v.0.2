package handlers

import (
	"archtool-backend/internal/db"
	"archtool-backend/internal/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"fmt"
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

// Получение бизнес-способности по ID
func GetBusinessCapabilityByID(c *gin.Context) {
	dbConn, err := db.Connect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer dbConn.Close()

	id := c.Param("id")

	type AttrRow struct {
		AttrName string `db:"name"`
		Value    string `db:"value_text"`
	}

	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Бизнес-способность'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	var rows []AttrRow
	err = dbConn.Select(&rows, `
		SELECT a.name, av.value_text
		FROM attribute_values av
		JOIN attributes a ON av.attribute_id = a.id
		WHERE av.object_type_id = $1 AND av.object_id = $2`, objectTypeID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Object not found"})
		return
	}

	result := map[string]string{"id": id}
	for _, row := range rows {
		result[row.AttrName] = row.Value
	}

	c.JSON(http.StatusOK, result)
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

	// Принимаем любые значения
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// Получаем object_type_id для "Бизнес-способность"
	var objectTypeID int
	err = dbConn.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Бизнес-способность'`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Object type not found"})
		return
	}

	// Получаем список атрибутов этого типа
	type Attr struct {
		ID   int    `db:"id"`
		Name string `db:"name"`
	}
	var attrs []Attr
	dbConn.Select(&attrs, `SELECT id, name FROM attributes WHERE object_type_id = $1`, objectTypeID)

	// Обновляем значения
	tx := dbConn.MustBegin()
	for _, attr := range attrs {
		rawVal, ok := input[attr.Name]
		if !ok {
			continue
		}
		val := fmt.Sprintf("%v", rawVal) // Универсальная строка

		_, err := tx.Exec(`
			INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (object_id, attribute_id) DO UPDATE SET value_text = EXCLUDED.value_text`,
			objectTypeID, objectID, attr.ID, val)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
			return
		}
	}
	tx.Commit()

	c.JSON(http.StatusOK, input)
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
