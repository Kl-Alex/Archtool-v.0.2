package models

type ObjectType struct {
	ID   int    `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type Attribute struct {
	ID              int     `db:"id" json:"id"`
	ObjectTypeID    int     `db:"object_type_id" json:"object_type_id"`
	Name            string  `db:"name" json:"name"`
	DisplayName     string  `db:"display_name" json:"display_name"`
	Type            string  `db:"type" json:"type"`
	IsRequired      bool    `db:"is_required" json:"is_required"`
	// Удалить:
	// Options         []string `db:"options" json:"options"`
	// RefObjectTypeID *int     `db:"ref_object_type" j*
}