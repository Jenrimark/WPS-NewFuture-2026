package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type WordResult struct {
	Word     string   `json:"word"`
	Meaning  string   `json:"meaning"`
	Examples []string `json:"examples"`
}

type OpenAICompatibleClient struct {
	APIKey  string
	BaseURL string
	Model   string
}

func (c OpenAICompatibleClient) GenerateWord(ctx context.Context, word string) (WordResult, error) {
	if c.APIKey == "" {
		return WordResult{}, errors.New("api key is empty")
	}
	// OpenAI 官方风格：Base 为 https://api.openai.com/v1 → 拼 /chat/completions。
	// 阿里云 DashScope 兼容模式：Base 已为 .../compatible-mode/v1 → 只拼 /chat/completions。
	base := strings.TrimRight(c.BaseURL, "/")
	path := "/v1/chat/completions"
	if strings.HasSuffix(base, "/v1") {
		path = "/chat/completions"
	}
	url := base + path

	systemPrompt := "你是英语学习助手。你必须只输出 JSON，不要输出多余文本。"
	userPrompt := fmt.Sprintf(`请为单词 "%s" 生成精准中文释义，以及 3 条英文例句。
要求：严格输出 JSON，格式如下：
{"word":"%s","meaning":"...","examples":["...","...","..."]}`, word, word)

	body := map[string]any{
		"model": c.Model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.2,
	}
	bs, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bs))
	if err != nil {
		return WordResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	httpClient := &http.Client{Timeout: 25 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return WordResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return WordResult{}, fmt.Errorf("ai http status: %s", resp.Status)
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return WordResult{}, err
	}
	if len(parsed.Choices) == 0 {
		return WordResult{}, errors.New("empty ai choices")
	}

	content := strings.TrimSpace(parsed.Choices[0].Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var result WordResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return WordResult{}, fmt.Errorf("invalid ai json: %w; raw=%s", err, content)
	}
	if result.Word == "" {
		result.Word = word
	}
	return result, nil
}

