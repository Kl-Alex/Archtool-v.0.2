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
	router.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"http://localhost:5173"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    ExposeHeaders:    []string{"Content-Length", "ETag"},
    AllowCredentials: true,
}))


	// Пинг
	router.GET("/api/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// Логин
	router.POST("/login", handlers.LoginHandler(dbConn))


	// Защищённая группа маршрутов
	authRoutes := router.Group("/api")
	authRoutes.Use(middleware.JWTAuthMiddleware())
	authRoutes.Use(middleware.ActionLogger(dbConn))

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
	authRoutes.PUT("/permissions/:id", handlers.UpdatePermission(dbConn))
	authRoutes.DELETE("/permissions/:id", handlers.DeletePermission(dbConn))

	authRoutes.DELETE("/roles/:role_id/permissions/:permission_id", handlers.RemovePermissionFromRole(dbConn))
	authRoutes.POST("/objects/:object_id/attributes/:attribute_id/value", handlers.SetAttributeValue(dbConn))



	authRoutes.GET("/applications", handlers.GetApplications)
	authRoutes.GET("/applications/:id", handlers.GetApplicationByID)
	authRoutes.POST("/applications", handlers.CreateApplication)
	authRoutes.PUT("/applications/:id", handlers.UpdateApplication )
	authRoutes.DELETE("/applications/:id", handlers.DeleteApplication)

	authRoutes.GET("/dictionaries/:name", handlers.GetDictionaryValues(dbConn))
	authRoutes.POST("/dictionaries/:name", handlers.AddDictionaryValue(dbConn))
	authRoutes.DELETE("/dictionaries/:name/:id", handlers.DeleteDictionaryValue(dbConn))
	authRoutes.GET("/dictionaries", handlers.ListDictionaries(dbConn))
	router.POST("/api/assistant", handlers.AssistantHandler)




	authRoutes.GET("/action_logs", handlers.GetActionLogs(dbConn))



	// Диаграммы (создание, чтение, обновление с версиями, удаление)
dh := handlers.NewDiagramsHandler()

authRoutes.GET("/diagrams", dh.ListDiagrams)                      // список + поиск + пагинация
authRoutes.POST("/diagrams", dh.CreateDiagram)                    // создать
authRoutes.GET("/diagrams/:id", dh.GetDiagram)                    // получить по id
authRoutes.PUT("/diagrams/:id", dh.UpdateDiagram)                 // обновить (поддерживает If-Match: <version>)
authRoutes.DELETE("/diagrams/:id", dh.DeleteDiagram)              // удалить

// История версий диаграмм
authRoutes.GET("/diagrams/:id/versions", dh.ListVersions)         // список версий
authRoutes.GET("/diagrams/:id/versions/:version", dh.GetVersion)  // конкретная версия

dbh := handlers.NewDiagramBindingsHandler()
authRoutes.POST("/diagrams/:id/bindings", dbh.CreateBinding)
authRoutes.GET("/diagrams/:id/bindings", dbh.GetBindingByCell)
authRoutes.DELETE("/diagrams/:id/bindings", dbh.DeleteBindingByCell)

authRoutes.GET("/technologies", handlers.GetTechnologies)
authRoutes.GET("technologies/:id", handlers.GetTechnologyByID)
authRoutes.POST("/technologies", handlers.CreateTechnology)
authRoutes.PUT("/technologies/:id", handlers.UpdateTechnology)
authRoutes.DELETE("/technologies/:id", handlers.DeleteTechnology)

authRoutes.GET("/platforms", handlers.GetPlatforms)
authRoutes.GET("/platforms/:id", handlers.GetPlatformByID)
authRoutes.POST("/platforms", handlers.CreatePlatform)
authRoutes.PUT("/platforms/:id", handlers.UpdatePlatform)
authRoutes.DELETE("/platforms/:id", handlers.DeletePlatform)

authRoutes.PUT("/api/objects/:type/:id", handlers.UpdateObject)

authRoutes.GET("/app_capabilities", handlers.GetAppCapabilities)
authRoutes.GET("/app_capabilities/:id", handlers.GetAppCapabilityByID)
authRoutes.POST("/app_capabilities", handlers.CreateAppCapability)
authRoutes.PUT("/app_capabilities/:id", handlers.UpdateAppCapability)
authRoutes.DELETE("/app_capabilities/:id", handlers.DeleteAppCapability)






	// Запуск сервера
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("Server is running on port " + port)
	router.Run(":" + port)
}
