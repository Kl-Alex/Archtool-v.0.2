package handlers

import (
	"net/http"
	"strconv"

	"archtool-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

//
// РОЛИ
//

// GET /api/roles — список ролей
func GetRoles(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var roles []models.Role
		if err := db.Select(&roles, `SELECT id, name FROM roles ORDER BY name`); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения ролей"})
			return
		}
		c.JSON(http.StatusOK, roles)
	}
}

//
// ПОЛЬЗОВАТЕЛИ
//

// GET /api/users — список пользователей
func GetUsers(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var users []models.User
		if err := db.Select(&users, `SELECT id, username FROM users ORDER BY id`); err != nil {
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

// GET /api/users/:id/roles — роли пользователя
func GetUserRoles(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID пользователя"})
			return
		}

		var roles []models.Role
		if err := db.Select(&roles, `
			SELECT r.id, r.name
			FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id = $1
			ORDER BY r.name
		`, userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения ролей пользователя"})
			return
		}
		c.JSON(http.StatusOK, roles)
	}
}

// DELETE /api/users/:id/roles/:role_id — снять роль у пользователя
func RemoveRoleFromUser(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID пользователя"})
			return
		}
		roleID, err := strconv.Atoi(c.Param("role_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID роли"})
			return
		}

		res, err := db.Exec(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, userID, roleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления роли"})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Связь не найдена"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Роль снята"})
	}
}

//
// ПРАВА (permissions)
//

// GET /api/permissions — весь справочник прав
func GetAllPermissions(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var perms []models.Permission
		if err := db.Select(&perms, `SELECT id, action, resource FROM permissions ORDER BY resource, action`); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения permissions"})
			return
		}
		c.JSON(http.StatusOK, perms)
	}
}

// GET /api/roles/:id/permissions — права роли
func GetPermissionsForRole(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID роли"})
			return
		}

		var perms []models.Permission
		if err := db.Select(&perms, `
			SELECT p.id, p.action, p.resource
			FROM permissions p
			JOIN role_permissions rp ON rp.permission_id = p.id
			WHERE rp.role_id = $1
			ORDER BY p.resource, p.action
		`, roleID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения permissions роли"})
			return
		}
		c.JSON(http.StatusOK, perms)
	}
}

// POST /api/roles/:id/permissions — выдать право роли
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

		if _, err := db.Exec(`
			INSERT INTO role_permissions (role_id, permission_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, roleID, body.PermissionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка назначения permission"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Permission назначен"})
	}
}

// DELETE /api/roles/:role_id/permissions/:permission_id — снять право у роли
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

		res, err := db.Exec(`
			DELETE FROM role_permissions
			WHERE role_id = $1 AND permission_id = $2
		`, roleID, permissionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления permission у роли"})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Связь не найдена"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Permission удалён из роли"})
	}
}

//
// РЕДАКТИРОВАНИЕ СПРАВОЧНИКА ПРАВ (опционально оставляем)
//

// PUT /api/permissions/:id — обновить строку permission
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
		if _, err := db.Exec(`
			UPDATE permissions
			SET action = $1, resource = $2
			WHERE id = $3
		`, input.Action, input.Resource, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления permission"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Permission обновлён"})
	}
}

// DELETE /api/permissions/:id — удалить строку permission
func DeletePermission(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
			return
		}
		if _, err := db.Exec(`DELETE FROM permissions WHERE id = $1`, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления permission"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Permission удалён"})
	}
}
