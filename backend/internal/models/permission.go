package models

type Permission struct {
	ID       int    `db:"id" json:"id"`
	Action   string `db:"action" json:"action"`
	Resource string `db:"resource" json:"resource"`
}
