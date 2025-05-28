package models

type AttributeInput struct {
	AttributeID int    `json:"attribute_id"`
	Value       string `json:"value"`
}

// Для бизнес-способностей (есть parent_id и level)
type CreateBusinessCapabilityInput struct {
	ObjectTypeID int              `json:"object_type_id"`
	ParentID     *string          `json:"parent_id"`
	Level        string           `json:"level"`
	Attributes   []AttributeInput `json:"attributes"`
}

// Для приложений (нет parent_id и level)
type CreateApplicationInput struct {
	ObjectTypeID int              `json:"object_type_id"`
	Attributes   []AttributeInput `json:"attributes"`
}
