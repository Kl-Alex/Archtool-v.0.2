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
			return // не логируем GET
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

		// Парсим тело
		var newData map[string]interface{}
		if len(bodyBytes) > 0 {
			_ = json.Unmarshal(bodyBytes, &newData)
		}

		oldData := map[string]interface{}{}

		// Особая логика для attribute_values
		var objectID, attributeID string
		if method == "POST" && strings.HasPrefix(urlPath, "/api/objects/") && strings.Contains(urlPath, "/attributes/") {
			if len(pathParts) >= 6 {
				objectID = pathParts[3]
				attributeID = pathParts[5]
				entity = "attribute_value"
				entityID = fmt.Sprintf("%s:%s", objectID, attributeID)

				// получаем старое значение
				var old string
				_ = db.Get(&old, `SELECT value_text FROM attribute_values WHERE object_id = $1 AND attribute_id = $2`, objectID, attributeID)
				oldData["value"] = old

				var parsed map[string]string
				_ = json.Unmarshal(bodyBytes, &parsed)
				newData["value"] = parsed["value"]
			}
		} else if method == "PUT" && entity != "" && entityID != "" {
			// получаем старую запись целиком
			query := fmt.Sprintf(`SELECT * FROM %s WHERE id = $1`, entity)
			_ = db.Get(&oldData, query, entityID)
		}

		// Продолжаем выполнение запроса
		c.Next()

		// Формируем details
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
					// поле новое
					changes = append(changes, fmt.Sprintf(`%s установлен как "%v"`, key, newV))
				}
			}
			details = strings.Join(changes, "; ")

			// если одно поле — логируем отдельно
			if len(newData) == 1 {
				for _, v := range newData {
					newVal = fmt.Sprint(v)
				}
				for _, v := range oldData {
					oldVal = fmt.Sprint(v)
				}
			}
		}

		// Записываем лог
		if details != "" {
			_, err := db.Exec(`
				INSERT INTO action_logs (user_id, action, entity, entity_id, old_value, new_value, details, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`, userID, strings.ToLower(method), entity, entityID, nullIfEmpty(oldVal), nullIfEmpty(newVal), details, time.Now())

			if err != nil {
				log.Println("Ошибка записи в action_logs:", err)
			}
		}
	}
}

func nullIfEmpty(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}
