package models

type ObjectType struct {
	ID   int    `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type Attribute struct {
	ID              int     `json:"id" db:"id"`
	ObjectTypeID    int     `json:"object_type_id" db:"object_type_id"`
	Name            string  `json:"name" db:"name"`
	Type            string  `json:"type" db:"type"`
	IsRequired      bool    `json:"is_required" db:"is_required"`
	Options         []string `json:"options,omitempty" db:"options"`
	RefObjectTypeID *int    `json:"ref_object_type,omitempty" db:"ref_object_type"`
}
