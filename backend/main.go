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
	// ...
authRoutes := router.Group("/api")
authRoutes.Use(middleware.JWTAuthMiddleware())
authRoutes.Use(middleware.ActionLogger(dbConn))

// Пример защищённого маршрута
authRoutes.GET("/protected", func(c *gin.Context) {
    userID, _ := c.Get("userID")
    c.JSON(http.StatusOK, gin.H{"message": "Добро пожаловать!", "user_id": userID})
})

// ---------- Бизнес-способности ----------
authRoutes.GET("/business_capabilities",
    middleware.RequirePermission(dbConn, "read", "business_capability"),
    handlers.GetBusinessCapabilities,
)
authRoutes.GET("/business_capabilities/:id",
    middleware.RequirePermission(dbConn, "read", "business_capability"),
    handlers.GetBusinessCapabilityByID,
)
authRoutes.POST("/business_capabilities",
    middleware.RequirePermission(dbConn, "create", "business_capability"),
    handlers.CreateBusinessCapability,
)
authRoutes.PUT("/business_capabilities/:id",
    middleware.RequirePermission(dbConn, "update", "business_capability"),
    handlers.UpdateBusinessCapability,
)
authRoutes.DELETE("/business_capabilities/:id",
    middleware.RequirePermission(dbConn, "delete", "business_capability"),
    handlers.DeleteBusinessCapability,
)

// ---------- Объектные типы / атрибуты ----------
authRoutes.GET("/object_types",
    middleware.RequirePermission(dbConn, "read", "attribute"),
    handlers.GetObjectTypes(dbConn),
)
authRoutes.GET("/object_types/:id/attributes",
    middleware.RequirePermission(dbConn, "read", "attribute"),
    handlers.GetAttributesByObjectType(dbConn),
)
authRoutes.POST("/object_types/:id/attributes",
    middleware.RequirePermission(dbConn, "create", "attribute"),
    handlers.CreateAttribute(dbConn),
)
authRoutes.DELETE("/attributes/:id",
    middleware.RequirePermission(dbConn, "delete", "attribute"),
    handlers.DeleteAttribute(dbConn),
)
authRoutes.POST("/objects/:object_id/attributes/:attribute_id/value",
    middleware.RequirePermission(dbConn, "update", "attribute"),
    handlers.SetAttributeValue(dbConn),
)
authRoutes.PUT("/objects/:type/:id",
    middleware.RequirePermission(dbConn, "update", "attribute"),
    handlers.UpdateObject,
)

authRoutes.GET("/object_types/:id/attribute_groups", middleware.RequirePermission(dbConn, "read", "attribute"), handlers.GetAttributeGroups(dbConn))
authRoutes.POST("/object_types/:id/attribute_groups", middleware.RequirePermission(dbConn, "create", "attribute"), handlers.CreateAttributeGroup(dbConn))
authRoutes.PUT("/attribute_groups/:groupID", middleware.RequirePermission(dbConn, "update", "attribute"), handlers.UpdateAttributeGroup(dbConn))
authRoutes.DELETE("/attribute_groups/:groupID", middleware.RequirePermission(dbConn, "delete", "attribute"), handlers.DeleteAttributeGroup(dbConn))

// ---------- Роли / пользователи / permissions ----------
authRoutes.GET("/roles",
    middleware.RequirePermission(dbConn, "read", "role"),
    handlers.GetRoles(dbConn),
)
authRoutes.GET("/roles/:id/permissions",
    middleware.RequirePermission(dbConn, "read", "role"),
    handlers.GetPermissionsForRole(dbConn),
)
authRoutes.POST("/roles/:id/permissions",
    middleware.RequirePermission(dbConn, "update", "role"),
    handlers.AssignPermissionToRole(dbConn),
)
authRoutes.DELETE("/roles/:role_id/permissions/:permission_id",
    middleware.RequirePermission(dbConn, "update", "role"),
    handlers.RemovePermissionFromRole(dbConn),
)

authRoutes.GET("/permissions",
    middleware.RequirePermission(dbConn, "read", "role"),
    handlers.GetAllPermissions(dbConn),
)
authRoutes.PUT("/permissions/:id",
    middleware.RequirePermission(dbConn, "update", "role"),
    handlers.UpdatePermission(dbConn),
)
authRoutes.DELETE("/permissions/:id",
    middleware.RequirePermission(dbConn, "delete", "role"),
    handlers.DeletePermission(dbConn),
)

authRoutes.GET("/users",
    middleware.RequirePermission(dbConn, "read", "user"),
    handlers.GetUsers(dbConn),
)
authRoutes.POST("/users/:id/roles",
    middleware.RequirePermission(dbConn, "update", "role"),
    handlers.AssignRoleToUser(dbConn),
)

authRoutes.GET("/users/:id/roles",
    middleware.RequirePermission(dbConn, "read", "user"),
    handlers.GetUserRoles(dbConn),
)
authRoutes.DELETE("/users/:id/roles/:role_id",
    middleware.RequirePermission(dbConn, "update", "role"),
    handlers.RemoveRoleFromUser(dbConn),
)



// ---------- Логи ----------
authRoutes.GET("/action_logs",
    middleware.RequirePermission(dbConn, "read", "log"),
    handlers.GetActionLogs(dbConn),
)

// ---------- Диаграммы ----------
dh := handlers.NewDiagramsHandler()
authRoutes.GET("/diagrams",
    middleware.RequirePermission(dbConn, "read", "diagram"),
    dh.ListDiagrams,
)
authRoutes.GET("/diagrams/:id",
    middleware.RequirePermission(dbConn, "read", "diagram"),
    dh.GetDiagram,
)
authRoutes.POST("/diagrams",
    middleware.RequirePermission(dbConn, "create", "diagram"),
    dh.CreateDiagram,
)
authRoutes.PUT("/diagrams/:id",
    middleware.RequirePermission(dbConn, "update", "diagram"),
    dh.UpdateDiagram,
)
authRoutes.DELETE("/diagrams/:id",
    middleware.RequirePermission(dbConn, "delete", "diagram"),
    dh.DeleteDiagram,
)
authRoutes.GET("/diagrams/:id/versions",
    middleware.RequirePermission(dbConn, "read", "diagram"),
    dh.ListVersions,
)
authRoutes.GET("/diagrams/:id/versions/:version",
    middleware.RequirePermission(dbConn, "read", "diagram"),
    dh.GetVersion,
)

dbh := handlers.NewDiagramBindingsHandler()
authRoutes.POST("/diagrams/:id/bindings",
    middleware.RequirePermission(dbConn, "update", "diagram"),
    dbh.CreateBinding,
)
authRoutes.GET("/diagrams/:id/bindings",
    middleware.RequirePermission(dbConn, "read", "diagram"),
    dbh.GetBindingByCell,
)
authRoutes.DELETE("/diagrams/:id/bindings",
    middleware.RequirePermission(dbConn, "update", "diagram"),
    dbh.DeleteBindingByCell,
)

// ---------- Приложения ----------
authRoutes.GET("/applications",
    middleware.RequirePermission(dbConn, "read", "application"),
    handlers.GetApplications,
)
authRoutes.GET("/applications/:id",
    middleware.RequirePermission(dbConn, "read", "application"),
    handlers.GetApplicationByID,
)
authRoutes.POST("/applications",
    middleware.RequirePermission(dbConn, "create", "application"),
    handlers.CreateApplication,
)
authRoutes.PUT("/applications/:id",
    middleware.RequirePermission(dbConn, "update", "application"),
    handlers.UpdateApplication,
)
authRoutes.DELETE("/applications/:id",
    middleware.RequirePermission(dbConn, "delete", "application"),
    handlers.DeleteApplication,
)

// ---------- Технологии ----------
authRoutes.GET("/technologies",
    middleware.RequirePermission(dbConn, "read", "technology"),
    handlers.GetTechnologies,
)
authRoutes.GET("/technologies/:id",
    middleware.RequirePermission(dbConn, "read", "technology"),
    handlers.GetTechnologyByID,
)
authRoutes.POST("/technologies",
    middleware.RequirePermission(dbConn, "create", "technology"),
    handlers.CreateTechnology,
)
authRoutes.PUT("/technologies/:id",
    middleware.RequirePermission(dbConn, "update", "technology"),
    handlers.UpdateTechnology,
)
authRoutes.DELETE("/technologies/:id",
    middleware.RequirePermission(dbConn, "delete", "technology"),
    handlers.DeleteTechnology,
)

// ---------- Платформы ----------
authRoutes.GET("/platforms",
    middleware.RequirePermission(dbConn, "read", "platform"),
    handlers.GetPlatforms,
)
authRoutes.GET("/platforms/:id",
    middleware.RequirePermission(dbConn, "read", "platform"),
    handlers.GetPlatformByID,
)
authRoutes.POST("/platforms",
    middleware.RequirePermission(dbConn, "create", "platform"),
    handlers.CreatePlatform,
)
authRoutes.PUT("/platforms/:id",
    middleware.RequirePermission(dbConn, "update", "platform"),
    handlers.UpdatePlatform,
)
authRoutes.DELETE("/platforms/:id",
    middleware.RequirePermission(dbConn, "delete", "platform"),
    handlers.DeletePlatform,
)

// ---------- Справочники ----------
authRoutes.GET("/dictionaries",
    middleware.RequirePermission(dbConn, "read", "dictionary"),
    handlers.ListDictionaries(dbConn),
)
authRoutes.GET("/dictionaries/:name",
    middleware.RequirePermission(dbConn, "read", "dictionary"),
    handlers.GetDictionaryValues(dbConn),
)
authRoutes.POST("/dictionaries/:name",
    middleware.RequirePermission(dbConn, "create", "dictionary"),
    handlers.AddDictionaryValue(dbConn),
)
authRoutes.DELETE("/dictionaries/:name/:id",
    middleware.RequirePermission(dbConn, "delete", "dictionary"),
    handlers.DeleteDictionaryValue(dbConn),
)

// ---------- Способности приложений ----------
authRoutes.GET("/app_capabilities",
  middleware.RequirePermission(dbConn, "read", "app_capability"),
  handlers.GetAppCapabilities,
)
authRoutes.GET("/app_capabilities/:id",
  middleware.RequirePermission(dbConn, "read", "app_capability"),
  handlers.GetAppCapabilityByID,
)
authRoutes.POST("/app_capabilities",
  middleware.RequirePermission(dbConn, "create", "app_capability"),
  handlers.CreateAppCapability,
)
authRoutes.PUT("/app_capabilities/:id",
  middleware.RequirePermission(dbConn, "update", "app_capability"),
  handlers.UpdateAppCapability,
)
authRoutes.DELETE("/app_capabilities/:id",
  middleware.RequirePermission(dbConn, "delete", "app_capability"),
  handlers.DeleteAppCapability,
)


// ассистент — реши сам, нужен ли доступ всем ролям или, например, только аутентифицированным
router.POST("/api/assistant", handlers.AssistantHandler)







	// Запуск сервера
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("Server is running on port " + port)
	router.Run(":" + port)
}