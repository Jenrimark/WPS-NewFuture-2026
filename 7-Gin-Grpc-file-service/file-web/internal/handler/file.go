package handler

import (
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"file-web/internal/service"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type File struct {
	svc             *service.File
	maxMultipartMem int64
}

// maxMultipartMem 传给 ParseMultipartForm；应与单文件上限（Save 的 CopyN）一致，避免只拦内存不拦落盘。
func NewFile(svc *service.File, maxMultipartMem int64) *File {
	return &File{svc: svc, maxMultipartMem: maxMultipartMem}
}

func (h *File) Register(r *gin.Engine) {
	r.POST("/api/files/uploads", h.Uploads)
	r.GET("/api/files", h.List)
	r.GET("/api/files/download/:id", h.Download)
}

// Uploads 批量上传：表单字段 files（可多文件）；若无则用 file 单文件。
func (h *File) Uploads(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(h.maxMultipartMem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid multipart"})
		return
	}
	var headers []*multipart.FileHeader
	form := c.Request.MultipartForm
	if form != nil {
		if fs := form.File["files"]; len(fs) > 0 {
			headers = append(headers, fs...)
		}
		if len(headers) == 0 {
			if fs := form.File["file"]; len(fs) > 0 {
				headers = append(headers, fs...)
			}
		}
	}
	if len(headers) == 0 {
		if fh, err := c.FormFile("file"); err == nil {
			headers = append(headers, fh)
		}
	}
	if len(headers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files"})
		return
	}

	results, err := h.svc.UploadMultipart(c.Request.Context(), headers)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(results) == 1 {
		r := results[0]
		if r.Error != "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": r.Error})
			return
		}
		c.JSON(http.StatusOK, r.FileView)
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": results})
}

func (h *File) List(c *gin.Context) {
	views, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, views)
}

func (h *File) Download(c *gin.Context) {
	idStr := c.Param("id")
	id, err := service.ParseIDParam(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	rc, mimeType, filename, err := h.svc.Download(c.Request.Context(), id)
	if err != nil {
		if st, ok := status.FromError(err); ok && st.Code() == codes.NotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rc.Close()

	if mimeType != "" {
		c.Header("Content-Type", mimeType)
	}
	c.Header("Content-Disposition", contentDispositionAttachment(filename))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, rc)
}

func sanitizeFilename(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	base = strings.ReplaceAll(base, `"`, `'`)
	if base == "." || base == string(filepath.Separator) || base == "" {
		return "download"
	}
	return base
}

// contentDispositionAttachment 设置下载文件名。纯 ASCII 时用 filename=；含中文等非 ASCII 时增加 RFC 5987 的 filename*=UTF-8''…，
// 避免 mime.FormatMediaType 因非法 ASCII 返回空导致仅有 attachment、客户端保存无后缀。
func contentDispositionAttachment(original string) string {
	safe := sanitizeFilename(original)
	if isAllASCII(safe) {
		if disp := mime.FormatMediaType("attachment", map[string]string{"filename": safe}); disp != "" {
			return disp
		}
	}
	ext := filepath.Ext(safe)
	fallback := "download" + ext
	disp := mime.FormatMediaType("attachment", map[string]string{"filename": fallback})
	if disp == "" {
		disp = "attachment; filename=\"" + strings.ReplaceAll(fallback, `"`, `'`) + "\""
	}
	if !isAllASCII(safe) {
		disp += "; filename*=UTF-8''" + encodeRFC5987(safe)
	}
	return disp
}

func isAllASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			return false
		}
	}
	return true
}

const hexUpper = "0123456789ABCDEF"

func encodeRFC5987(s string) string {
	var b strings.Builder
	for _, x := range []byte(s) {
		switch {
		case (x >= '0' && x <= '9') || (x >= 'a' && x <= 'z') || (x >= 'A' && x <= 'Z'),
			x == '.', x == '-', x == '_':
			b.WriteByte(x)
		default:
			b.WriteByte('%')
			b.WriteByte(hexUpper[x>>4])
			b.WriteByte(hexUpper[x&0x0f])
		}
	}
	return b.String()
}
