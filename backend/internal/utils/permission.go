package utils

import (
	"github.com/jmoiron/sqlx"
)

func HasPermission(db *sqlx.DB, userID int64, action, resource string) (bool, error) {
	query := `
SELECT COUNT(*) 
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE ur.user_id = $1 AND p.action = $2 AND p.resource = $3
`
	var count int
	err := db.Get(&count, query, userID, action, resource)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
