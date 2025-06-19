package handlers

import (
	"archtool-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
)

func GetDictionaryValues(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		dict := c.Param("name")
		var values []models.ReferenceValue

		err := db.Select(&values, `
			SELECT id, value FROM reference_data WHERE dictionary_name = $1 ORDER BY value
		`, dict)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении справочника"})
			return
		}

		c.JSON(http.StatusOK, values)
	}
}

func AddDictionaryValue(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		dict := c.Param("name")
		var input struct {
			Value string `json:"value"`
		}

		if err := c.ShouldBindJSON(&input); err != nil || input.Value == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимый ввод"})
			return
		}

		_, err := db.Exec(`
			INSERT INTO reference_data (dictionary_name, value) VALUES ($1, $2)
		`, dict, input.Value)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при добавлении значения"})
			return
		}

		c.Status(http.StatusOK)
	}
}

func DeleteDictionaryValue(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		dict := c.Param("name")
		id := c.Param("id")

		_, err := db.Exec(`
			DELETE FROM reference_data WHERE id = $1 AND dictionary_name = $2
		`, id, dict)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при удалении"})
			return
		}

		c.Status(http.StatusOK)
	}
}


func ListDictionaries(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var names []string
		err := db.Select(&names, `
			SELECT DISTINCT dictionary_name FROM reference_data ORDER BY dictionary_name
		`)
		if err != nil {
			c.JSON(500, gin.H{"error": "Ошибка получения списка справочников"})
			return
		}
		c.JSON(200, names)
	}
}
