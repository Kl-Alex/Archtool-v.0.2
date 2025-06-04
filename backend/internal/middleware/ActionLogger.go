package middleware

import (
	"bytes"
	"io"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func ActionLogger(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		// Чтение тела запроса (для POST/PUT)
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Получение userID из контекста (установлен в JWT middleware)
var userID *int
if val, exists := c.Get("userID"); exists {
	if id, ok := val.(int64); ok {
		i := int(id)
		userID = &i
	}
}


		// Продолжить выполнение запроса
		c.Next()

		// Определим действие
		method := c.Request.Method
		action := map[string]string{
			"POST":   "create",
			"PUT":    "update",
			"DELETE": "delete",
		}[method]

		if action == "" {
			return // логируем только мутации
		}

		// Определим сущность и ID
		pathParts := strings.Split(strings.Trim(c.Request.URL.Path, "/"), "/")
		entity := ""
		entityID := ""

		if len(pathParts) >= 2 {
			entity = pathParts[1]
			if len(pathParts) > 2 {
				entityID = pathParts[2]
			}
		}

		if entity == "" {
			log.Println("Пропущено логирование: не удалось определить entity")
			return
		}

		_, err := db.Exec(`
			INSERT INTO action_logs (user_id, action, entity, entity_id, timestamp)
			VALUES ($1, $2, $3, $4, $5)
		`, userID, action, entity, entityID, time.Now())
		if err != nil {
			log.Println("Ошибка записи в action_logs:", err)
		}
	}
}
