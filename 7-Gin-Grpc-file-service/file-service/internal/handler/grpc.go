package handler

import (
	"context"

	"local.dev/ginfilepb/gen/filepb"
	"file-service/internal/model"
	"file-service/internal/service"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type FileGRPC struct {
	filepb.UnimplementedFileServiceServer
	svc *service.File
}

func NewFileGRPC(svc *service.File) *FileGRPC {
	return &FileGRPC{svc: svc}
}

func (h *FileGRPC) SaveFileRecord(ctx context.Context, req *filepb.SaveFileRecordRequest) (*filepb.SaveFileRecordResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	m := &model.File{
		OriginalName: req.GetOriginalName(),
		StoredName:   req.GetStoredName(),
		Size:         req.GetSize(),
		MimeType:     req.GetMimeType(),
		Path:         req.GetPath(),
	}
	id, err := h.svc.Save(ctx, m)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "save: %v", err)
	}
	return &filepb.SaveFileRecordResponse{Id: id}, nil
}

func (h *FileGRPC) ListFiles(ctx context.Context, _ *filepb.ListFilesRequest) (*filepb.ListFilesResponse, error) {
	rows, err := h.svc.List(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "list: %v", err)
	}
	files := make([]*filepb.FileRecord, 0, len(rows))
	for i := range rows {
		files = append(files, toPB(&rows[i]))
	}
	return &filepb.ListFilesResponse{Files: files}, nil
}

func (h *FileGRPC) GetFileById(ctx context.Context, req *filepb.GetFileByIdRequest) (*filepb.GetFileByIdResponse, error) {
	if req == nil || req.GetId() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}
	f, err := h.svc.GetByID(ctx, req.GetId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get: %v", err)
	}
	if f == nil {
		return nil, status.Error(codes.NotFound, "file not found")
	}
	return &filepb.GetFileByIdResponse{File: toPB(f)}, nil
}

func toPB(f *model.File) *filepb.FileRecord {
	return &filepb.FileRecord{
		Id:           f.ID,
		OriginalName: f.OriginalName,
		StoredName:   f.StoredName,
		Size:         f.Size,
		MimeType:     f.MimeType,
		Path:         f.Path,
	}
}
