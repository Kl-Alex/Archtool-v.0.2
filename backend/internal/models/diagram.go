package models

import "time"

type Diagram struct {
	ID           string     `db:"id"            json:"id"`
	Name         string     `db:"name"          json:"name"`
	RegistryType *string    `db:"registry_type" json:"registry_type,omitempty"`
	XML          string     `db:"xml"           json:"xml"`
	OwnerID      *int64     `db:"owner_id"      json:"owner_id,omitempty"`
	Version      int        `db:"version"       json:"version"`
	CreatedAt    time.Time  `db:"created_at"    json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"    json:"updated_at"`
}

type DiagramVersion struct {
	DiagramID    string     `db:"diagram_id"    json:"diagram_id"`
	Version      int        `db:"version"       json:"version"`
	Name         string     `db:"name"          json:"name"`
	RegistryType *string    `db:"registry_type" json:"registry_type,omitempty"`
	XML          string     `db:"xml"           json:"xml"`
	ModifiedBy   *int64     `db:"modified_by"   json:"modified_by,omitempty"`
	CreatedAt    time.Time  `db:"created_at"    json:"created_at"`
}
