package models

import "time"

type ActionLog struct {
	ID        int64     `db:"id" json:"id"`
	UserID    *int64    `db:"user_id" json:"user_id,omitempty"`
	Username  *string   `db:"username" json:"username,omitempty"`
	Action    string    `db:"action" json:"action"`
	Entity    string    `db:"entity" json:"entity"`
	EntityID  string    `db:"entity_id" json:"entity_id"`
	Timestamp time.Time `db:"timestamp" json:"timestamp"`
}
