package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"archtool-backend/internal/db"
	"archtool-backend/internal/handlers"
	"archtool-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Загрузка .env
	if err := godotenv.Load(); err != nil {
		log.Fatal("Ошибка загрузки .env файла")
	}

	// Подключение к БД
	dbConn, err := db.Connect()
	if err != nil {
		log.Fatal("Ошибка подключения к БД:", err)
	}
	defer dbConn.Close()

	router := gin.Default()
	router.Use(cors.Default())

	// Пинг
	router.GET("/api/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// Логин
	router.POST("/login", handlers.LoginHandler(dbConn))

	// Защищённая группа маршрутов
	authRoutes := router.Group("/api")
	authRoutes.Use(middleware.JWTAuthMiddleware())

	// Пример защищённого маршрута
	authRoutes.GET("/protected", func(c *gin.Context) {
		userID, _ := c.Get("userID")
		c.JSON(http.StatusOK, gin.H{"message": "Добро пожаловать!", "user_id": userID})
	})

	// Роуты для бизнес-способностей
	authRoutes.GET("/business_capabilities/:id", handlers.GetBusinessCapabilityByID)
	authRoutes.PUT("/business_capabilities/:id", handlers.UpdateBusinessCapability)
	authRoutes.GET("/business_capabilities", handlers.GetBusinessCapabilities)
	authRoutes.POST("/business_capabilities", handlers.CreateBusinessCapability)
	authRoutes.DELETE("/business_capabilities/:id", handlers.DeleteBusinessCapability)
	authRoutes.GET("/object_types", handlers.GetObjectTypes(dbConn))
    authRoutes.GET("/object_types/:id/attributes", handlers.GetAttributesByObjectType(dbConn))
	authRoutes.POST("/object_types/:id/attributes", handlers.CreateAttribute(dbConn))
	authRoutes.DELETE("/attributes/:id", handlers.DeleteAttribute(dbConn))

	authRoutes.GET("/roles", handlers.GetRoles(dbConn))
	authRoutes.GET("/users", handlers.GetUsers(dbConn))
	authRoutes.POST("/users/:id/roles", handlers.AssignRoleToUser(dbConn))

	authRoutes.GET("/permissions", handlers.GetAllPermissions(dbConn))
	authRoutes.GET("/roles/:id/permissions", handlers.GetPermissionsForRole(dbConn))
	authRoutes.POST("/roles/:id/permissions", handlers.AssignPermissionToRole(dbConn))
	authRoutes.PUT("/api/permissions/:id", handlers.UpdatePermission(dbConn))
	authRoutes.DELETE("/api/permissions/:id", handlers.DeletePermission(dbConn))

	authRoutes.DELETE("/roles/:role_id/permissions/:permission_id", handlers.RemovePermissionFromRole(dbConn))
	authRoutes.POST("/api/objects/:object_id/attributes/:attribute_id/value", handlers.SetAttributeValue(dbConn))




	// Запуск сервера
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("Server is running on port " + port)
	router.Run(":" + port)
}
