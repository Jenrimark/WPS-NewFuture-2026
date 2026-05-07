package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"file-service/internal/model"
)

type File struct {
	db *sql.DB
}

func NewFile(db *sql.DB) *File {
	return &File{db: db}
}

func (r *File) Create(ctx context.Context, f *model.File) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO files (original_name, stored_name, size, mime_type, path) VALUES (?, ?, ?, ?, ?)`,
		f.OriginalName, f.StoredName, f.Size, f.MimeType, f.Path,
	)
	if err != nil {
		return 0, fmt.Errorf("insert: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("last id: %w", err)
	}
	return id, nil
}

func (r *File) List(ctx context.Context) ([]model.File, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, original_name, stored_name, size, mime_type, path FROM files ORDER BY id ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var out []model.File
	for rows.Next() {
		var f model.File
		if err := rows.Scan(&f.ID, &f.OriginalName, &f.StoredName, &f.Size, &f.MimeType, &f.Path); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *File) GetByID(ctx context.Context, id int64) (*model.File, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, original_name, stored_name, size, mime_type, path FROM files WHERE id = ?`,
		id,
	)
	var f model.File
	if err := row.Scan(&f.ID, &f.OriginalName, &f.StoredName, &f.Size, &f.MimeType, &f.Path); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("scan: %w", err)
	}
	return &f, nil
}
