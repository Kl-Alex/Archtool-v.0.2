package handlers

import (
	"archtool-backend/internal/db"
	"archtool-backend/internal/utils"
	"database/sql"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"net/http"
	"strconv"
)


// PUT /api/objects/:type/:id
func UpdateObject(c *gin.Context) {
    dbConn, err := db.Connect()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
        return
    }
    defer dbConn.Close()

    objectType := c.Param("type") // например "Приложение", "Технология", "Платформа"
    objectID := c.Param("id")

    // получаем object_type_id
    var typeID int
    if err := dbConn.Get(&typeID, `SELECT id FROM object_types WHERE name = $1`, objectType); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown object type"})
        return
    }

    // читаем input
    var input struct {
        Attributes []struct {
            AttributeID int         `json:"attribute_id"`
            Value       interface{} `json:"value"`
        } `json:"attributes"`
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON", "details": err.Error()})
        return
    }

    if len(input.Attributes) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No attributes to update"})
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
        `, attr.AttributeID, typeID).Scan(&attrType, &isMultiple, pq.Array(&options), &dictName); err != nil {
            tx.Rollback()
            c.JSON(http.StatusBadRequest, gin.H{"error": "Атрибут не найден", "attr_id": attr.AttributeID})
            return
        }

        valStr := toString(attr.Value)

        // ✅ валидация по типам
        switch attrType {
        case "number":
            if _, err := strconv.ParseFloat(valStr, 64); err != nil {
                tx.Rollback()
                c.JSON(http.StatusBadRequest, gin.H{"error": "Должно быть числом", "attr_id": attr.AttributeID})
                return
            }
        case "boolean":
            if valStr != "true" && valStr != "false" {
                tx.Rollback()
                c.JSON(http.StatusBadRequest, gin.H{"error": "Должно быть true/false", "attr_id": attr.AttributeID})
                return
            }
        case "date":
            if !isValidDate(valStr) {
                tx.Rollback()
                c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты", "attr_id": attr.AttributeID})
                return
            }
        case "select":
            if isMultiple {
                var selected []string
                if err := json.Unmarshal([]byte(valStr), &selected); err != nil {
                    tx.Rollback()
                    c.JSON(http.StatusBadRequest, gin.H{"error": "Невалидный JSON для multiple select", "attr_id": attr.AttributeID})
                    return
                }
                for _, v := range selected {
                    if dictName.Valid {
                        var cnt int
                        if err := dbConn.Get(&cnt, `SELECT COUNT(*) FROM reference_data WHERE dictionary_name=$1 AND value=$2`, dictName.String, v); err != nil || cnt == 0 {
                            tx.Rollback()
                            c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + v, "attr_id": attr.AttributeID})
                            return
                        }
                    } else if !utils.Contains(options, v) {
                        tx.Rollback()
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + v, "attr_id": attr.AttributeID})
                        return
                    }
                }
            } else {
                if dictName.Valid {
                    var cnt int
                    if err := dbConn.Get(&cnt, `SELECT COUNT(*) FROM reference_data WHERE dictionary_name=$1 AND value=$2`, dictName.String, valStr); err != nil || cnt == 0 {
                        tx.Rollback()
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + valStr, "attr_id": attr.AttributeID})
                        return
                    }
                } else if !utils.Contains(options, valStr) {
                    tx.Rollback()
                    c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение: " + valStr, "attr_id": attr.AttributeID})
                    return
                }
            }
        case "string":
            // always ok
        default:
            tx.Rollback()
            c.JSON(http.StatusBadRequest, gin.H{"error": "Неизвестный тип атрибута", "attr_id": attr.AttributeID})
            return
        }

        // UPSERT
        if _, err := tx.Exec(`
            INSERT INTO attribute_values (object_type_id, object_id, attribute_id, value_text)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT (object_id, attribute_id)
            DO UPDATE SET value_text = EXCLUDED.value_text
        `, typeID, objectID, attr.AttributeID, valStr); err != nil {
            tx.Rollback()
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed", "attr_id": attr.AttributeID})
            return
        }
    }

    if err := tx.Commit(); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "TX commit failed"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"status": "updated"})
}
