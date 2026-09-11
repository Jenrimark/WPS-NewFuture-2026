package models

import "time"

type Poster struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Title     string    `gorm:"size:100" json:"title"`
	Width     int       `json:"width"`
	Height    int       `json:"height"`
	Data      string    `gorm:"type:text" json:"data"`
	ThumbURL  string    `gorm:"size:500" json:"thumb_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
