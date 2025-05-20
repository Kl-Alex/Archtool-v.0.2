package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"github.com/jmoiron/sqlx"

	"archtool-backend/internal/models"
	"archtool-backend/internal/utils"
)

func LoginHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат запроса"})
			return
		}

		var user models.User
		err := db.QueryRowx("SELECT id, username, password FROM users WHERE username = $1", input.Username).
			Scan(&user.ID, &user.Username, &user.Password)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный логин или пароль"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный логин или пароль"})
			return
		}

		token, err := utils.GenerateJWT(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при генерации токена"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"token": token})
	}
}
