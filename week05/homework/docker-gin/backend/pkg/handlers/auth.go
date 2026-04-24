package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"wordapp-backend/pkg/models"
)

type AuthHandler struct {
	db        *gorm.DB
	jwtSecret string
}

func NewAuthHandler(db *gorm.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

type registerReq struct {
	Username string `json:"username" binding:"required,min=3,max=64"`
	Password string `json:"password" binding:"required,min=6,max=128"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "hash password failed"})
		return
	}

	u := models.User{
		Username:     req.Username,
		PasswordHash: string(hash),
	}
	if err := h.db.Create(&u).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "USER_EXISTS", "message": "username already exists"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": u.ID, "username": u.Username})
}

type loginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": err.Error()})
		return
	}

	var u models.User
	if err := h.db.Where("username = ?", req.Username).First(&u).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "INVALID_CREDENTIALS", "message": "invalid username or password"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "INVALID_CREDENTIALS", "message": "invalid username or password"})
		return
	}

	now := time.Now()
	claims := jwt.MapClaims{
		"uid": u.ID,
		"sub": u.Username,
		"iat": now.Unix(),
		"exp": now.Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "sign token failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenStr})
}

