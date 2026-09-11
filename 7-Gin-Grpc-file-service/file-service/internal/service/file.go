package service

import (
	"context"

	"file-service/internal/model"
	"file-service/internal/repository"
)

type File struct {
	repo *repository.File
}

func NewFile(repo *repository.File) *File {
	return &File{repo: repo}
}

func (s *File) Save(ctx context.Context, f *model.File) (int64, error) {
	return s.repo.Create(ctx, f)
}

func (s *File) List(ctx context.Context) ([]model.File, error) {
	return s.repo.List(ctx)
}

func (s *File) GetByID(ctx context.Context, id int64) (*model.File, error) {
	return s.repo.GetByID(ctx, id)
}
