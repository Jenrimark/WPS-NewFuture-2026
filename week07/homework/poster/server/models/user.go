package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"uniqueIndex;size:50" json:"username"`
	Password  string    `gorm:"size:255" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	Posters   []Poster  `gorm:"foreignKey:UserID" json:"posters,omitempty"`
}
