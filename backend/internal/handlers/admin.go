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

// GET /api/permissions
func GetAllPermissions(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var perms []models.Permission
err := db.Select(&perms, "SELECT id, action, resource FROM permissions")

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения permissions"})
			return
		}
		c.JSON(http.StatusOK, perms)
	}
}

// GET /api/roles/:id/permissions
func GetPermissionsForRole(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID роли"})
			return
		}

		var perms []models.Permission
		err = db.Select(&perms, `
			SELECT p.id, p.action
			FROM permissions p
			JOIN role_permissions rp ON rp.permission_id = p.id
			WHERE rp.role_id = $1
		`, roleID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения permissions роли"})
			return
		}

		c.JSON(http.StatusOK, perms)
	}
}

// POST /api/roles/:id/permissions
func AssignPermissionToRole(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID роли"})
			return
		}

		var body struct {
			PermissionID int `json:"permission_id"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный JSON"})
			return
		}

		_, err = db.Exec(`
			INSERT INTO role_permissions (role_id, permission_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, roleID, body.PermissionID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка назначения permission"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Permission назначен"})
	}
}

// PUT /api/permissions/:id
func UpdatePermission(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
			return
		}

		var input models.Permission
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный JSON"})
			return
		}

		_, err = db.Exec(`
			UPDATE permissions
			SET action = $1, resource = $2
			WHERE id = $3
		`, input.Action, input.Resource, id)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления permission"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Permission обновлён"})
	}
}

// DELETE /api/permissions/:id
func DeletePermission(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
			return
		}

		_, err = db.Exec(`DELETE FROM permissions WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления permission"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Permission удалён"})
	}
}


// DELETE /api/roles/:role_id/permissions/:permission_id
func RemovePermissionFromRole(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID, err := strconv.Atoi(c.Param("role_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID роли"})
			return
		}

		permissionID, err := strconv.Atoi(c.Param("permission_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID permission"})
			return
		}

		result, err := db.Exec(`
			DELETE FROM role_permissions
			WHERE role_id = $1 AND permission_id = $2
		`, roleID, permissionID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления permission у роли"})
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Связь не найдена"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Permission удалён из роли"})
	}
}