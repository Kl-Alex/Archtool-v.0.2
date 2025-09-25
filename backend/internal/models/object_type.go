package models

import "github.com/lib/pq"
import "database/sql"


type ObjectType struct {
	ID   int    `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type AttributeGroup struct {
	ID            int    `db:"id" json:"id"`
	ObjectTypeID  int    `db:"object_type_id" json:"object_type_id"`
	Name          string `db:"name" json:"name"`
	DisplayName   string `db:"display_name" json:"display_name"`
	SortOrder     int    `db:"sort_order" json:"sort_order"`
	IsCollapsible bool   `db:"is_collapsible" json:"is_collapsible"`
}

type Attribute struct {
	ID             int            `db:"id" json:"id"`
	ObjectTypeID   int            `db:"object_type_id" json:"object_type_id"`
	Name           string         `db:"name" json:"name"`
	DisplayName    string         `db:"display_name" json:"display_name"`
	Type           string         `db:"type" json:"type"`
	IsRequired     bool           `db:"is_required" json:"is_required"`
	IsMultiple     bool           `db:"is_multiple" json:"is_multiple"`
	Options        pq.StringArray `db:"options" json:"options"`
	DictionaryName sql.NullString `db:"dictionary_name" json:"dictionary_name"`
	DateFormat     *string        `db:"date_format" json:"date_format,omitempty"`
	GroupID        sql.NullInt64  `db:"group_id" json:"group_id"`

	// Удобно фронту при выборке
	GroupDisplayName sql.NullString `db:"group_display_name" json:"group_display_name,omitempty"`
	GroupSortOrder   sql.NullInt64  `db:"group_sort_order" json:"group_sort_order,omitempty"`
}
