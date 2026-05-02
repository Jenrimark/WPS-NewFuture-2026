package service

import (
	"time"

	"gorm.io/gorm"

	"wordapp-backend/model"
)

type StatsService struct {
	db *gorm.DB
}

func NewStatsService(db *gorm.DB) *StatsService {
	return &StatsService{db: db}
}

type providerCountRow struct {
	AI string `gorm:"column:ai_provider"`
	C  int64  `gorm:"column:c"`
}

// Summary 返回当前用户词本聚合统计（不统计已软删记录）。
func (s *StatsService) Summary(uid uint64) (total int64, last7 int64, by map[string]int64, err error) {
	by = make(map[string]int64)
	base := s.db.Model(&model.Word{}).Where("user_id = ? AND deleted_at IS NULL", uid)
	if err = base.Count(&total).Error; err != nil {
		return 0, 0, nil, err
	}
	since := time.Now().AddDate(0, 0, -7)
	if err = s.db.Model(&model.Word{}).
		Where("user_id = ? AND deleted_at IS NULL AND created_at >= ?", uid, since).
		Count(&last7).Error; err != nil {
		return 0, 0, nil, err
	}
	var rows []providerCountRow
	if err = s.db.Model(&model.Word{}).
		Select("ai_provider, count(*) as c").
		Where("user_id = ? AND deleted_at IS NULL", uid).
		Group("ai_provider").
		Scan(&rows).Error; err != nil {
		return 0, 0, nil, err
	}
	for _, r := range rows {
		by[r.AI] = r.C
	}
	return total, last7, by, nil
}
