package models

type ReferenceValue struct {
	ID    int    `db:"id" json:"id"`
	Value string `db:"value" json:"value"`
}
