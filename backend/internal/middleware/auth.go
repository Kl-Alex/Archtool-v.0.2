package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"archtool-backend/internal/utils"
)

func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Отсутствует заголовок Authorization"})
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		userID, username, err := utils.ParseJWT(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Недействительный или просроченный токен"})
			return
		}

		// Добавляем userID и username в контекст запроса
		c.Set("userID", userID)
		c.Set("username", username)

		c.Next()
	}
}
