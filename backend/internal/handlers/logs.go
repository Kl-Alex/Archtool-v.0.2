package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func GetActionLogs(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Queryx(`
			SELECT l.id, l.user_id, u.username, l.action, l.entity, l.entity_id, l.timestamp
			FROM action_logs l
			LEFT JOIN users u ON l.user_id = u.id
			ORDER BY l.timestamp DESC
			LIMIT 100
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось получить логи"})
			return
		}
		defer rows.Close()

		var logs []map[string]interface{}
		for rows.Next() {
			row := make(map[string]interface{})
			if err := rows.MapScan(row); err == nil {
				logs = append(logs, row)
			}
		}

		c.JSON(http.StatusOK, logs)
	}
}
