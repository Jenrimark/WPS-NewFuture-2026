package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"wordapp-backend/pkg/ai"
	"wordapp-backend/pkg/config"
	"wordapp-backend/pkg/middleware"
	"wordapp-backend/pkg/models"
)

type WordHandler struct {
	db  *gorm.DB
	cfg config.Config
}

func NewWordHandler(db *gorm.DB, cfg config.Config) *WordHandler {
	return &WordHandler{db: db, cfg: cfg}
}

func userIDFromCtx(c *gin.Context) uint64 {
	v, _ := c.Get(middleware.CtxUserIDKey)
	uid, _ := v.(uint64)
	return uid
}

func (h *WordHandler) QueryWord(c *gin.Context) {
	word := strings.TrimSpace(c.Query("word"))
	provider := strings.TrimSpace(c.Query("ai_provider"))
	if word == "" || provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": "word and ai_provider are required"})
		return
	}
	uid := userIDFromCtx(c)

	// 1) 已保存则直接返回
	var existing models.Word
	err := h.db.Where("user_id = ? AND word = ? AND deleted_at IS NULL", uid, word).First(&existing).Error
	if err == nil {
		var examples []string
		_ = json.Unmarshal([]byte(existing.ExamplesJSON), &examples)
		c.JSON(http.StatusOK, gin.H{
			"source": "db",
			"data": gin.H{
				"id":          existing.ID,
				"word":        existing.Word,
				"meaning":     existing.Meaning,
				"examples":    examples,
				"ai_provider": existing.AIProvider,
			},
		})
		return
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "db query failed"})
		return
	}

	// 2) 未保存则调用 AI（只返回，不落库）
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	var client ai.OpenAICompatibleClient
	switch strings.ToLower(provider) {
	case "deepseek":
		client = ai.OpenAICompatibleClient{
			APIKey:  h.cfg.DeepSeekAPIKey,
			BaseURL: h.cfg.DeepSeekBaseURL,
			Model:   h.cfg.DeepSeekModel,
		}
	case "qwen":
		client = ai.OpenAICompatibleClient{
			APIKey:  h.cfg.QwenAPIKey,
			BaseURL: h.cfg.QwenBaseURL,
			Model:   h.cfg.QwenModel,
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": "ai_provider must be deepseek or qwen"})
		return
	}

	res, err := client.GenerateWord(ctx, word)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": "AI_ERROR", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"source": "ai",
		"data": gin.H{
			"word":        res.Word,
			"meaning":     res.Meaning,
			"examples":    res.Examples,
			"ai_provider": provider,
		},
	})
}

type saveWordReq struct {
	Word       string   `json:"word" binding:"required"`
	Meaning    string   `json:"meaning" binding:"required"`
	Examples   []string `json:"examples" binding:"required,min=3"`
	AIProvider string   `json:"ai_provider" binding:"required"`
}

func (h *WordHandler) SaveWord(c *gin.Context) {
	var req saveWordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": err.Error()})
		return
	}
	uid := userIDFromCtx(c)
	exJSON, _ := json.Marshal(req.Examples)

	w := models.Word{
		UserID:       uid,
		Word:         strings.TrimSpace(req.Word),
		Meaning:      req.Meaning,
		ExamplesJSON: string(exJSON),
		AIProvider:   req.AIProvider,
	}

	if err := h.db.Create(&w).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "DUPLICATE", "message": "word already saved"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": w.ID})
}

func (h *WordHandler) ListWords(c *gin.Context) {
	uid := userIDFromCtx(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	var total int64
	if err := h.db.Model(&models.Word{}).
		Where("user_id = ? AND deleted_at IS NULL", uid).
		Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "count failed"})
		return
	}

	var rows []models.Word
	if err := h.db.Where("user_id = ? AND deleted_at IS NULL", uid).
		Order("id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "query failed"})
		return
	}

	items := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		var examples []string
		_ = json.Unmarshal([]byte(r.ExamplesJSON), &examples)
		items = append(items, gin.H{
			"id":          r.ID,
			"word":        r.Word,
			"meaning":     r.Meaning,
			"examples":    examples,
			"ai_provider": r.AIProvider,
			"created_at":  r.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"page":      page,
		"page_size": pageSize,
		"total":     total,
		"items":     items,
	})
}

func (h *WordHandler) DeleteWord(c *gin.Context) {
	uid := userIDFromCtx(c)
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": "invalid id"})
		return
	}

	now := time.Now()
	res := h.db.Model(&models.Word{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, uid).
		Updates(map[string]any{"deleted_at": &now})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "delete failed"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND", "message": "word not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

