package models

import (
	"time"
)

type User struct {
	ID           uint64    `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Username     string    `gorm:"column:username" json:"username"`
	PasswordHash string    `gorm:"column:password_hash" json:"-"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (User) TableName() string { return "users" }

type Word struct {
	ID          uint64     `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	UserID      uint64     `gorm:"column:user_id" json:"user_id"`
	Word        string     `gorm:"column:word" json:"word"`
	Meaning     string     `gorm:"column:meaning" json:"meaning"`
	ExamplesJSON string    `gorm:"column:examples_json" json:"examples_json"`
	AIProvider  string     `gorm:"column:ai_provider" json:"ai_provider"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt   *time.Time `gorm:"column:deleted_at" json:"deleted_at"`
}

func (Word) TableName() string { return "words" }

