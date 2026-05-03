package service

import "errors"

var (
	ErrUserExists         = errors.New("username already exists")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrDuplicateWord      = errors.New("word already saved")
	ErrWordNotFound       = errors.New("word not found")
	ErrBadAIProvider = errors.New("ai_provider must be deepseek or qwen")
)

// AIInvokeError 表示大模型调用失败，供 API 层映射为 AI_ERROR。
type AIInvokeError struct {
	Msg string
}

func (e *AIInvokeError) Error() string { return e.Msg }
