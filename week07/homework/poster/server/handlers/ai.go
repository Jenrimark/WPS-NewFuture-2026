package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"poster-server/config"

	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	Config *config.Config
}

type aiGenRequest struct {
	Prompt string `json:"prompt"`
}

// POST /api/ai/generate — 代理百炼文生图（异步任务 + 轮询）
func (h *AIHandler) Generate(c *gin.Context) {
	cfg := h.Config
	key := strings.TrimSpace(cfg.DashscopeAPIKey)
	if key == "" || key == "your-api-key" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "未配置 DASHSCOPE_API_KEY"})
		return
	}

	var req aiGenRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Prompt) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供 prompt"})
		return
	}

	base := strings.TrimSuffix(strings.TrimSpace(cfg.DashscopeBase), "/")
	submitURL := base + "/api/v1/services/aigc/text2image/image-synthesis"

	body := map[string]any{
		"model": cfg.DashscopeModel,
		"input": map[string]string{"prompt": strings.TrimSpace(req.Prompt)},
		"parameters": map[string]any{
			"size":           "1024*1024",
			"n":              1,
			"prompt_extend":  true,
			"watermark":      false,
		},
	}
	raw, _ := json.Marshal(body)

	httpReq, err := http.NewRequest(http.MethodPost, submitURL, bytes.NewReader(raw))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "构建请求失败"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+key)
	httpReq.Header.Set("X-DashScope-Async", "enable")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("提交任务失败: %v", err)})
		return
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("百炼返回 %d: %s", resp.StatusCode, string(respBody))})
		return
	}

	var submit struct {
		Output struct {
			TaskID string `json:"task_id"`
		} `json:"output"`
	}
	if err := json.Unmarshal(respBody, &submit); err != nil || submit.Output.TaskID == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "未解析到 task_id", "raw": string(respBody)})
		return
	}

	taskURL := fmt.Sprintf("%s/api/v1/tasks/%s", base, submit.Output.TaskID)
	pollClient := &http.Client{Timeout: 30 * time.Second}
	for i := 0; i < 90; i++ {
		if i > 0 {
			time.Sleep(2 * time.Second)
		}
		pr, err := http.NewRequest(http.MethodGet, taskURL, nil)
		if err != nil {
			continue
		}
		pr.Header.Set("Authorization", "Bearer "+key)
		pres, err := pollClient.Do(pr)
		if err != nil {
			continue
		}
		pb, _ := io.ReadAll(pres.Body)
		pres.Body.Close()

		var task struct {
			Output struct {
				TaskStatus string `json:"task_status"`
				Results    []struct {
					URL string `json:"url"`
				} `json:"results"`
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"output"`
		}
		_ = json.Unmarshal(pb, &task)
		st := task.Output.TaskStatus
		if st == "SUCCEEDED" {
			for _, r := range task.Output.Results {
				if r.URL != "" {
					c.JSON(http.StatusOK, gin.H{"url": r.URL})
					return
				}
			}
			c.JSON(http.StatusBadGateway, gin.H{"error": "任务成功但未返回图片 URL", "raw": string(pb)})
			return
		}
		if st == "FAILED" {
			c.JSON(http.StatusBadGateway, gin.H{
				"error": fmt.Sprintf("生成失败: %s %s", task.Output.Code, task.Output.Message),
			})
			return
		}
	}

	c.JSON(http.StatusGatewayTimeout, gin.H{"error": "轮询超时，请稍后重试"})
}
