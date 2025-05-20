package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"archtool-backend/internal/models"
)

// GET /api/roles — список ролей
func GetRoles(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var roles []models.Role
		err := db.Select(&roles, "SELECT id, name FROM roles")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения ролей"})
			return
		}
		c.JSON(http.StatusOK, roles)
	}
}

// GET /api/users — список пользователей
func GetUsers(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var users []models.User
		err := db.Select(&users, "SELECT id, username FROM users")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения пользователей"})
			return
		}
		c.JSON(http.StatusOK, users)
	}
}

// POST /api/users/:id/roles — назначить пользователю роль
func AssignRoleToUser(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID пользователя"})
			return
		}

		var body struct {
			RoleID int `json:"role_id"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный JSON"})
			return
		}

		_, err = db.Exec(`
			INSERT INTO user_roles (user_id, role_id) 
			VALUES ($1, $2) 
			ON CONFLICT DO NOTHING
		`, userID, body.RoleID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось назначить роль"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Роль назначена"})
	}
}
