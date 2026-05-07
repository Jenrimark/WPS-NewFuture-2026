package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Local 将文件保存在 uploadRoot/uploads 下，路径格式 uploads/<storedName>。
type Local struct {
	uploadRoot string
	maxBytes   int64
}

func NewLocal(uploadRoot string, maxBytes int64) *Local {
	if maxBytes <= 0 {
		maxBytes = 32 << 20
	}
	return &Local{uploadRoot: filepath.Clean(uploadRoot), maxBytes: maxBytes}
}

// MaxBytes 单文件允许的最大字节数（Save 使用 io.CopyN 限制）。
func (l *Local) MaxBytes() int64 {
	return l.maxBytes
}

// Save 流式读取 src（不超过 maxBytes），计算 SHA-256，按哈希前缀+扩展名命名并写入磁盘；返回相对路径（如 uploads/abc.png）、存储名、字节数、MIME。
func (l *Local) Save(src io.Reader, originalName string) (relPath, storedName string, size int64, mimeType string, err error) {
	ext := strings.ToLower(path.Ext(originalName))
	destDir := filepath.Join(l.uploadRoot, "uploads")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", "", 0, "", err
	}

	tmp, err := os.CreateTemp(destDir, "upload-part-*")
	if err != nil {
		return "", "", 0, "", err
	}
	tmpPath := tmp.Name()

	h := sha256.New()
	mw := io.MultiWriter(tmp, h)
	limit := l.maxBytes + 1
	n, copyErr := io.CopyN(mw, src, limit)
	closeTmp := func() {
		_ = tmp.Close()
	}
	if copyErr != nil && copyErr != io.EOF {
		closeTmp()
		_ = os.Remove(tmpPath)
		return "", "", 0, "", copyErr
	}
	if n > l.maxBytes {
		closeTmp()
		_ = os.Remove(tmpPath)
		return "", "", 0, "", fmt.Errorf("file exceeds maximum size (%d bytes)", l.maxBytes)
	}
	size = n

	if _, err = tmp.Seek(0, io.SeekStart); err != nil {
		closeTmp()
		_ = os.Remove(tmpPath)
		return "", "", 0, "", err
	}
	head := make([]byte, 512)
	nread, readErr := tmp.Read(head)
	if readErr != nil && readErr != io.EOF {
		closeTmp()
		_ = os.Remove(tmpPath)
		return "", "", 0, "", readErr
	}
	snip := head[:nread]

	if err = tmp.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return "", "", 0, "", err
	}

	sum := h.Sum(nil)
	hashHex := hex.EncodeToString(sum)
	prefix := hashHex
	if len(prefix) > 12 {
		prefix = prefix[:12]
	}
	storedName = prefix + ext

	destPath := filepath.Join(destDir, storedName)
	if err = os.Rename(tmpPath, destPath); err != nil {
		_ = os.Remove(tmpPath)
		return "", "", 0, "", err
	}

	mimeType = mime.TypeByExtension(ext)
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = http.DetectContentType(snip)
	}

	rel := path.Join("uploads", filepath.ToSlash(storedName))
	return rel, storedName, size, mimeType, nil
}

// Remove 删除数据库 path 对应的本地文件（路径校验规则与 OpenForDownload 一致）。
func (l *Local) Remove(recordPath string) error {
	abs, err := l.resolveUploadAbs(recordPath)
	if err != nil {
		return err
	}
	return os.Remove(abs)
}

func (l *Local) resolveUploadAbs(recordPath string) (string, error) {
	cleanRec := filepath.ToSlash(strings.TrimSpace(recordPath))
	if cleanRec == "" || strings.Contains(cleanRec, "..") {
		return "", fmt.Errorf("invalid path")
	}
	abs := filepath.Join(l.uploadRoot, filepath.FromSlash(cleanRec))
	abs = filepath.Clean(abs)
	uploadsRoot := filepath.Clean(filepath.Join(l.uploadRoot, "uploads"))
	rel, err := filepath.Rel(uploadsRoot, abs)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path outside uploads")
	}
	return abs, nil
}

// OpenForDownload 根据数据库中的相对 path（如 uploads/x.png）打开文件，并校验不越界 uploadRoot/uploads。
func (l *Local) OpenForDownload(recordPath string) (*os.File, error) {
	abs, err := l.resolveUploadAbs(recordPath)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(abs)
	if err != nil {
		return nil, err
	}
	return f, nil
}
