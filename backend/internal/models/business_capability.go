package models

type BusinessCapability struct {
	ID          string  `db:"id" json:"id"`
	Name        *string `db:"name" json:"name"`
	ParentName  *string `db:"parent_name" json:"parent_name"`
	ParentID    *string `db:"parent_id" json:"parent_id"`
	Owner       *string `db:"owner" json:"owner"`
	ItDomain    *string `db:"it_domain" json:"it_domain"`
	Description *string `db:"description" json:"description"`
	Level       *string `db:"level" json:"level"`
}
