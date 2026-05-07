package model

// File 对应 SQLite 行与 HTTP/gRPC 中的文件元数据。
type File struct {
	ID            int64
	OriginalName  string
	StoredName    string
	Size          int64
	MimeType      string
	Path          string
}
