package utils

import (
    "time"
    "github.com/golang-jwt/jwt/v5"
)

var JwtSecret = []byte("supersecretkey") // вынести в env

func GenerateJWT(userID int64) (string, error) {
    claims := jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(time.Hour * 72).Unix(),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(JwtSecret)
}

func ParseJWT(tokenString string) (int64, error) {
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return JwtSecret, nil
    })

    if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
        return int64(claims["user_id"].(float64)), nil
    } else {
        return 0, err
    }
}
