package utils

import (
    "time"
    "github.com/golang-jwt/jwt/v5"
)

var JwtSecret = []byte("supersecretkey") // лучше вынести в .env

// Принимает userID и username
func GenerateJWT(userID int64, username string) (string, error) {
    claims := jwt.MapClaims{
        "user_id":  userID,
        "username": username,
        "exp":      time.Now().Add(72 * time.Hour).Unix(),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(JwtSecret)
}

func ParseJWT(tokenString string) (int64, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return JwtSecret, nil
	})

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID := int64(claims["user_id"].(float64))

		username := ""
		if unameRaw, ok := claims["username"]; ok {
			username, _ = unameRaw.(string) // безопасное приведение
		}

		return userID, username, nil
	}

	return 0, "", err
}
