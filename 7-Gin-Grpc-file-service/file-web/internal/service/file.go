package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"strconv"

	"file-web/internal/grpcclient"
	"file-web/internal/storage"
)

// ErrNotFound 表示记录不存在或磁盘上找不到对应文件。
var ErrNotFound = errors.New("not found")

type File struct {
	store  *storage.Local
	client *grpcclient.Client
}

type FileView struct {
	ID            int64  `json:"id"`
	OriginalName  string `json:"original_name"`
	StoredName    string `json:"stored_name"`
	Size          int64  `json:"size"`
	MimeType      string `json:"mime_type"`
	Path          string `json:"path"`
}

// UploadItemResult 单文件上传结果：成功时 Error 为空且 FileView 有效；失败时 Error 非空。
type UploadItemResult struct {
	FileView
	Error string `json:"error,omitempty"`
}

func New(store *storage.Local, client *grpcclient.Client) *File {
	return &File{store: store, client: client}
}

func (s *File) UploadMultipart(ctx context.Context, headers []*multipart.FileHeader) ([]UploadItemResult, error) {
	if len(headers) == 0 {
		return nil, fmt.Errorf("no files")
	}
	out := make([]UploadItemResult, 0, len(headers))
	for _, h := range headers {
		f, err := h.Open()
		if err != nil {
			out = append(out, UploadItemResult{FileView: FileView{OriginalName: h.Filename}, Error: err.Error()})
			continue
		}
		relPath, storedName, size, mimeType, err := s.store.Save(f, h.Filename)
		_ = f.Close()
		if err != nil {
			out = append(out, UploadItemResult{FileView: FileView{OriginalName: h.Filename}, Error: err.Error()})
			continue
		}
		id, err := s.client.SaveRecord(ctx, h.Filename, storedName, size, mimeType, relPath)
		if err != nil {
			_ = s.store.Remove(relPath)
			out = append(out, UploadItemResult{FileView: FileView{OriginalName: h.Filename}, Error: err.Error()})
			continue
		}
		out = append(out, UploadItemResult{
			FileView: FileView{
				ID:           id,
				OriginalName: h.Filename,
				StoredName:   storedName,
				Size:         size,
				MimeType:     mimeType,
				Path:         relPath,
			},
		})
	}
	return out, nil
}

func (s *File) List(ctx context.Context) ([]FileView, error) {
	rows, err := s.client.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]FileView, 0, len(rows))
	for _, r := range rows {
		out = append(out, FileView{
			ID:           r.GetId(),
			OriginalName: r.GetOriginalName(),
			StoredName:   r.GetStoredName(),
			Size:         r.GetSize(),
			MimeType:     r.GetMimeType(),
			Path:         r.GetPath(),
		})
	}
	return out, nil
}

func (s *File) Download(ctx context.Context, id int64) (rc io.ReadCloser, mimeType, filename string, err error) {
	rec, err := s.client.GetByID(ctx, id)
	if err != nil {
		return nil, "", "", err
	}
	if rec == nil {
		return nil, "", "", ErrNotFound
	}
	f, err := s.store.OpenForDownload(rec.GetPath())
	if err != nil {
		if os.IsNotExist(err) {
			return nil, "", "", ErrNotFound
		}
		return nil, "", "", err
	}
	return f, rec.GetMimeType(), rec.GetOriginalName(), nil
}

func ParseIDParam(s string) (int64, error) {
	return strconv.ParseInt(s, 10, 64)
}
