package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apimw "wordapp-backend/api/middleware"
	"wordapp-backend/service"
)

type StatsHandler struct {
	svc *service.StatsService
}

func NewStatsHandler(svc *service.StatsService) *StatsHandler {
	return &StatsHandler{svc: svc}
}

func statsUserID(c *gin.Context) uint64 {
	v, _ := c.Get(apimw.CtxUserIDKey)
	uid, _ := v.(uint64)
	return uid
}

func (h *StatsHandler) Summary(c *gin.Context) {
	uid := statsUserID(c)
	total, last7, by, err := h.svc.Summary(uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "stats failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"total_words":       total,
		"words_last_7_days": last7,
		"by_ai_provider":    by,
	})
}
