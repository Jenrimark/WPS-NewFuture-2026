package api

import (
	"bytes"
	"encoding/csv"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	apimw "wordapp-backend/api/middleware"
	"wordapp-backend/service"
)

type WordHandler struct {
	svc *service.WordService
}

func NewWordHandler(svc *service.WordService) *WordHandler {
	return &WordHandler{svc: svc}
}

func userIDFromCtx(c *gin.Context) uint64 {
	v, _ := c.Get(apimw.CtxUserIDKey)
	uid, _ := v.(uint64)
	return uid
}

func (h *WordHandler) QueryWord(c *gin.Context) {
	uid := userIDFromCtx(c)
	source, payload, err := h.svc.QueryWord(c.Request.Context(), uid, c.Query("word"), c.Query("ai_provider"))
	if err != nil {
		var aiErr *service.AIInvokeError
		if errors.As(err, &aiErr) {
			c.JSON(http.StatusBadGateway, gin.H{"code": "AI_ERROR", "message": aiErr.Msg})
			return
		}
		if errors.Is(err, service.ErrBadAIProvider) || err.Error() == "word and ai_provider are required" {
			c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "db query failed"})
		return
	}
	data := gin.H{
		"word":        payload.Word,
		"meaning":     payload.Meaning,
		"examples":    payload.Examples,
		"ai_provider": payload.AIProvider,
	}
	if source == "db" {
		data["id"] = payload.ID
		data["notes"] = payload.Notes
	}
	c.JSON(http.StatusOK, gin.H{"source": source, "data": data})
}

type saveWordReq struct {
	Word       string   `json:"word" binding:"required"`
	Meaning    string   `json:"meaning" binding:"required"`
	Examples   []string `json:"examples" binding:"required,min=3"`
	AIProvider string   `json:"ai_provider" binding:"required"`
	Note       string   `json:"note" binding:"omitempty,max=2000"`
}

func (h *WordHandler) SaveWord(c *gin.Context) {
	var req saveWordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": err.Error()})
		return
	}
	uid := userIDFromCtx(c)
	id, err := h.svc.SaveWord(uid, req.Word, req.Meaning, req.Examples, req.AIProvider, req.Note)
	if err != nil {
		if errors.Is(err, service.ErrDuplicateWord) {
			c.JSON(http.StatusBadRequest, gin.H{"code": "DUPLICATE", "message": "word already saved"})
			return
		}
		if errors.Is(err, service.ErrNoteTooLong) {
			c.JSON(http.StatusBadRequest, gin.H{"code": "NOTE_TOO_LONG", "message": "note exceeds max length"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id})
}

func (h *WordHandler) ListWords(c *gin.Context) {
	uid := userIDFromCtx(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	out, err := h.svc.ListWords(uid, page, pageSize, c.Query("q"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "query failed"})
		return
	}
	items := make([]gin.H, 0, len(out.Items))
	for _, r := range out.Items {
		item := gin.H{
			"id":          r.ID,
			"word":        r.Word,
			"meaning":     r.Meaning,
			"examples":    r.Examples,
			"ai_provider": r.AIProvider,
			"notes":       r.Notes,
		}
		if r.HasCreatedAt {
			item["created_at"] = r.CreatedAt
		}
		items = append(items, item)
	}
	c.JSON(http.StatusOK, gin.H{
		"page":      out.Page,
		"page_size": out.PageSize,
		"total":     out.Total,
		"items":     items,
	})
}

type patchNoteReq struct {
	Note string `json:"note" binding:"max=2000"`
}

func (h *WordHandler) PatchNote(c *gin.Context) {
	var req patchNoteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": err.Error()})
		return
	}
	uid := userIDFromCtx(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": "invalid id"})
		return
	}
	if err := h.svc.UpdateWordNote(uid, id, req.Note); err != nil {
		if errors.Is(err, service.ErrWordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND", "message": "word not found"})
			return
		}
		if errors.Is(err, service.ErrNoteTooLong) {
			c.JSON(http.StatusBadRequest, gin.H{"code": "NOTE_TOO_LONG", "message": "note exceeds max length"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *WordHandler) ExportWords(c *gin.Context) {
	uid := userIDFromCtx(c)
	rows, err := h.svc.ListWordsForExport(uid, 5000)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "export failed"})
		return
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"word", "meaning", "examples_json", "ai_provider", "created_at", "notes"})
	for _, r := range rows {
		_ = w.Write([]string{
			r.Word,
			r.Meaning,
			r.ExamplesJSON,
			r.AIProvider,
			r.CreatedAt.Format(time.RFC3339Nano),
			r.Notes,
		})
	}
	w.Flush()
	if err := w.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "csv write failed"})
		return
	}
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="wordbook.csv"`)
	c.Data(http.StatusOK, "text/csv; charset=utf-8", buf.Bytes())
}

func (h *WordHandler) DeleteWord(c *gin.Context) {
	uid := userIDFromCtx(c)
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "BAD_REQUEST", "message": "invalid id"})
		return
	}
	if err := h.svc.SoftDeleteWord(uid, id); err != nil {
		if errors.Is(err, service.ErrWordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"code": "NOT_FOUND", "message": "word not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL_ERROR", "message": "delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
