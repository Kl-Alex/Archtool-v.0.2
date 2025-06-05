package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func ActionLogger(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// userID
		var userID *int
		if val, exists := c.Get("userID"); exists {
			if id, ok := val.(int64); ok {
				uid := int(id)
				userID = &uid
			}
		}

		method := strings.ToUpper(c.Request.Method)
		if method == "GET" {
			c.Next()
			return // Пропускаем логирование GET-запросов
		}

		urlPath := c.Request.URL.Path
		pathParts := strings.Split(strings.Trim(urlPath, "/"), "/")

		var entity, entityID string
		if len(pathParts) >= 2 {
			entity = pathParts[1]
			if len(pathParts) > 2 {
				entityID = pathParts[2]
			}
		}

		var newData map[string]interface{}
		if len(bodyBytes) > 0 {
			_ = json.Unmarshal(bodyBytes, &newData)
		}

		oldData := map[string]interface{}{}

		// Подгружаем старые значения для бизнес-способности
		if (method == "PUT" || method == "DELETE") && entity == "business_capabilities" && entityID != "" {
			var objectTypeID int
			err := db.Get(&objectTypeID, `SELECT id FROM object_types WHERE name = 'Бизнес-способность'`)
			if err == nil {
				var values []struct {
					AttrID int    `db:"attribute_id"`
					Name   string `db:"name"`
					Value  string `db:"value_text"`
				}
				db.Select(&values, `
					SELECT av.attribute_id, a.name, av.value_text
					FROM attribute_values av
					JOIN attributes a ON a.id = av.attribute_id
					WHERE av.object_type_id = $1 AND av.object_id = $2`, objectTypeID, entityID)

				for _, v := range values {
					oldData[v.Name] = v.Value
				}
			}
		}

		// Продолжаем выполнение запроса
		c.Next()


		var details string
		var oldVal, newVal string

		if len(oldData) > 0 && len(newData) > 0 {
			var changes []string
			for key, newV := range newData {
				if oldV, ok := oldData[key]; ok {
					if fmt.Sprint(oldV) != fmt.Sprint(newV) {
						changes = append(changes, fmt.Sprintf(`%s изменён с "%v" на "%v"`, key, oldV, newV))
					}
				} else {
					changes = append(changes, fmt.Sprintf(`%s установлен как "%v"`, key, newV))
				}
			}
			details = strings.Join(changes, "; ")

			if len(newData) == 1 {
				for _, v := range newData {
					newVal = fmt.Sprint(v)
				}
				for _, v := range oldData {
					oldVal = fmt.Sprint(v)
				}
			}
		} else if len(newData) > 0 {
			// Например, POST без старых данных
			b, _ := json.Marshal(newData)
			details = fmt.Sprintf("Создано: %s", b)
			newVal = string(b)
		} else if method == "DELETE" {
			b, _ := json.Marshal(oldData)
			details = fmt.Sprintf("Удалено: %s", b)
			oldVal = string(b)
		}

		_, err := db.Exec(`
			INSERT INTO action_logs (user_id, action, entity, entity_id, old_value, new_value, details, timestamp)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, userID, strings.ToLower(method), entity, entityID, nullIfEmpty(oldVal), nullIfEmpty(newVal), details, time.Now())
		if err != nil {
			log.Println("Ошибка записи в action_logs:", err)
		}
	}
}

func nullIfEmpty(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}
