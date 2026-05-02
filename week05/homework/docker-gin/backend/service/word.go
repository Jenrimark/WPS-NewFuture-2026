package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"wordapp-backend/pkg/ai"
	"wordapp-backend/pkg/config"
	"wordapp-backend/model"
)

type WordService struct {
	db  *gorm.DB
	cfg config.Config
}

func NewWordService(db *gorm.DB, cfg config.Config) *WordService {
	return &WordService{db: db, cfg: cfg}
}

type WordPayload struct {
	ID           uint64
	Word         string
	Meaning      string
	Examples     []string
	AIProvider   string
	Notes        string
	CreatedAt    time.Time
	HasCreatedAt bool
}

type WordListOutcome struct {
	Page     int
	PageSize int
	Total    int64
	Items    []WordPayload
}

func (s *WordService) QueryWord(ctx context.Context, uid uint64, word, provider string) (source string, payload WordPayload, err error) {
	word = strings.TrimSpace(word)
	provider = strings.TrimSpace(provider)
	if word == "" || provider == "" {
		return "", WordPayload{}, errors.New("word and ai_provider are required")
	}

	var existing model.Word
	err = s.db.Where("user_id = ? AND word = ? AND deleted_at IS NULL", uid, word).First(&existing).Error
	if err == nil {
		var examples []string
		_ = json.Unmarshal([]byte(existing.ExamplesJSON), &examples)
		return "db", WordPayload{
			ID:         existing.ID,
			Word:       existing.Word,
			Meaning:    existing.Meaning,
			Examples:   examples,
			AIProvider: existing.AIProvider,
			Notes:      existing.Notes,
		}, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", WordPayload{}, err
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var client ai.OpenAICompatibleClient
	switch strings.ToLower(provider) {
	case "deepseek":
		client = ai.OpenAICompatibleClient{
			APIKey:  s.cfg.DeepSeekAPIKey,
			BaseURL: s.cfg.DeepSeekBaseURL,
			Model:   s.cfg.DeepSeekModel,
		}
	case "qwen":
		client = ai.OpenAICompatibleClient{
			APIKey:  s.cfg.QwenAPIKey,
			BaseURL: s.cfg.QwenBaseURL,
			Model:   s.cfg.QwenModel,
		}
	default:
		return "", WordPayload{}, ErrBadAIProvider
	}

	res, err := client.GenerateWord(ctx, word)
	if err != nil {
		return "", WordPayload{}, &AIInvokeError{Msg: err.Error()}
	}
	return "ai", WordPayload{
		Word:       res.Word,
		Meaning:    res.Meaning,
		Examples:   res.Examples,
		AIProvider: provider,
	}, nil
}

const maxWordNoteLen = 2000

func (s *WordService) SaveWord(uid uint64, word, meaning string, examples []string, aiProvider, note string) (id uint64, err error) {
	note = strings.TrimSpace(note)
	if len(note) > maxWordNoteLen {
		return 0, ErrNoteTooLong
	}
	exJSON, _ := json.Marshal(examples)
	w := model.Word{
		UserID:       uid,
		Word:         strings.TrimSpace(word),
		Meaning:      meaning,
		ExamplesJSON: string(exJSON),
		AIProvider:   aiProvider,
		Notes:        note,
	}
	if err := s.db.Create(&w).Error; err != nil {
		return 0, ErrDuplicateWord
	}
	return w.ID, nil
}

func (s *WordService) ListWords(uid uint64, page, pageSize int, keyword string) (WordListOutcome, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	keyword = strings.TrimSpace(keyword)
	q := s.db.Model(&model.Word{}).Where("user_id = ? AND deleted_at IS NULL", uid)
	if keyword != "" {
		q = q.Where("LOCATE(?, word) > 0", keyword)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return WordListOutcome{}, err
	}

	var rows []model.Word
	q2 := s.db.Where("user_id = ? AND deleted_at IS NULL", uid)
	if keyword != "" {
		q2 = q2.Where("LOCATE(?, word) > 0", keyword)
	}
	if err := q2.Order("id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&rows).Error; err != nil {
		return WordListOutcome{}, err
	}

	items := make([]WordPayload, 0, len(rows))
	for _, r := range rows {
		var examples []string
		_ = json.Unmarshal([]byte(r.ExamplesJSON), &examples)
		items = append(items, WordPayload{
			ID:           r.ID,
			Word:         r.Word,
			Meaning:      r.Meaning,
			Examples:     examples,
			AIProvider:   r.AIProvider,
			Notes:        r.Notes,
			CreatedAt:    r.CreatedAt,
			HasCreatedAt: true,
		})
	}
	return WordListOutcome{
		Page:     page,
		PageSize: pageSize,
		Total:    total,
		Items:    items,
	}, nil
}

// ListWordsForExport 导出词本（最多 maxRows 条，按 id 倒序）。
func (s *WordService) ListWordsForExport(uid uint64, maxRows int) ([]model.Word, error) {
	if maxRows < 1 || maxRows > 5000 {
		maxRows = 2000
	}
	var rows []model.Word
	err := s.db.Where("user_id = ? AND deleted_at IS NULL", uid).
		Order("id DESC").
		Limit(maxRows).
		Find(&rows).Error
	return rows, err
}

func (s *WordService) UpdateWordNote(uid, wordID uint64, note string) error {
	note = strings.TrimSpace(note)
	if len(note) > maxWordNoteLen {
		return ErrNoteTooLong
	}
	res := s.db.Model(&model.Word{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", wordID, uid).
		Updates(map[string]any{"notes": note})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrWordNotFound
	}
	return nil
}

func (s *WordService) SoftDeleteWord(uid, id uint64) error {
	now := time.Now()
	res := s.db.Model(&model.Word{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, uid).
		Updates(map[string]any{"deleted_at": &now})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrWordNotFound
	}
	return nil
}
