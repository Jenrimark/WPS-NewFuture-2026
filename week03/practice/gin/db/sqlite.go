package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type SQLiteConfig struct {
	// Path is a filesystem path to the sqlite database file.
	// If empty, defaults to ./data/students.db (relative to project working dir).
	Path string
}

func OpenSQLite(cfg SQLiteConfig) (*sql.DB, error) {
	path := cfg.Path
	if path == "" {
		path = filepath.Join("data", "students.db")
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("mkdir sqlite dir: %w", err)
	}

	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	db.SetMaxOpenConns(1) // sqlite works best single-writer
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	if err := migrateSQLite(db); err != nil {
		_ = db.Close()
		return nil, err
	}

	log.Printf("[db] sqlite connected: %s", path)
	return db, nil
}

func migrateSQLite(db *sql.DB) error {
	// Minimal schema for CRUD. Keep it consistent with models.Student.
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  grade TEXT NOT NULL
);
`)
	if err != nil {
		return fmt.Errorf("migrate sqlite: %w", err)
	}
	return nil
}
