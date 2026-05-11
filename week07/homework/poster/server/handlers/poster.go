package handlers

import (
	"net/http"
	"strconv"

	"poster-server/database"
	"poster-server/models"

	"github.com/gin-gonic/gin"
)

type PosterHandler struct{}

type posterRequest struct {
	Title    string `json:"title"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Data     string `json:"data"`
	ThumbURL string `json:"thumb_url"`
}

func (h *PosterHandler) List(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var posters []models.Poster
	if err := database.DB.Where("user_id = ?", userID).Order("updated_at DESC").Find(&posters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取海报列表失败"})
		return
	}

	c.JSON(http.StatusOK, posters)
}

func (h *PosterHandler) Create(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req posterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if req.Title == "" {
		req.Title = "未命名海报"
	}
	if req.Width == 0 {
		req.Width = 600
	}
	if req.Height == 0 {
		req.Height = 800
	}

	poster := models.Poster{
		UserID:   userID,
		Title:    req.Title,
		Width:    req.Width,
		Height:   req.Height,
		Data:     req.Data,
		ThumbURL: req.ThumbURL,
	}

	if err := database.DB.Create(&poster).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建海报失败"})
		return
	}

	c.JSON(http.StatusOK, poster)
}

func (h *PosterHandler) Get(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的海报ID"})
		return
	}

	var poster models.Poster
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&poster).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "海报不存在"})
		return
	}

	c.JSON(http.StatusOK, poster)
}

func (h *PosterHandler) Update(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的海报ID"})
		return
	}

	var poster models.Poster
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&poster).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "海报不存在"})
		return
	}

	var req posterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Width > 0 {
		updates["width"] = req.Width
	}
	if req.Height > 0 {
		updates["height"] = req.Height
	}
	if req.Data != "" {
		updates["data"] = req.Data
	}
	if req.ThumbURL != "" {
		updates["thumb_url"] = req.ThumbURL
	}

	if err := database.DB.Model(&poster).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新海报失败"})
		return
	}

	database.DB.First(&poster, poster.ID)
	c.JSON(http.StatusOK, poster)
}

func (h *PosterHandler) Delete(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的海报ID"})
		return
	}

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Poster{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "海报不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
