package db

import (
	"log"

	"gorm.io/gorm"
)

// RunStructuralMigrations 在连接成功后执行与 init.sql 对齐的一次性结构变更（可重复执行）。
func RunStructuralMigrations(db *gorm.DB) error {
	if err := dropWordsNotesColumnIfExists(db); err != nil {
		return err
	}
	return nil
}

func dropWordsNotesColumnIfExists(db *gorm.DB) error {
	var n int64
	err := db.Raw(`
		SELECT COUNT(*) FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE()
		  AND TABLE_NAME = 'words'
		  AND COLUMN_NAME = 'notes'
	`).Scan(&n).Error
	if err != nil {
		return err
	}
	if n == 0 {
		return nil
	}
	if err := db.Exec("ALTER TABLE words DROP COLUMN notes").Error; err != nil {
		return err
	}
	log.Printf("[db] migration: dropped words.notes (legacy column)")
	return nil
}
