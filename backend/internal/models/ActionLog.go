package models

import "time"


type ActionLog struct {
	ID        int       `db:"id"`
	UserID    int       `db:"user_id"`
	Action    string    `db:"action"`       // например: "create", "update", "delete", "view"
	Entity    string    `db:"entity"`       // например: "business_capability"
	EntityID  string    `db:"entity_id"`    // UUID или ID
	Timestamp time.Time `db:"timestamp"`
}
