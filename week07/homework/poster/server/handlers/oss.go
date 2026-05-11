package handlers

import (
	"fmt"
	"net/http"
	"time"

	"poster-server/config"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/sts"
	"github.com/gin-gonic/gin"
)

type OSSHandler struct {
	Config *config.Config
}

// GET /api/oss/sts — 返回临时凭证供前端直传 OSS
func (h *OSSHandler) GetSTS(c *gin.Context) {
	cfg := h.Config
	if cfg.AliAccessKeyID == "" || cfg.AliAccessKeySecret == "" || cfg.AliRAMRoleARN == "" || cfg.OSSBucket == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "未配置 OSS（需 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_RAM_ROLE_ARN / OSS_BUCKET）",
		})
		return
	}

	client, err := sts.NewClientWithAccessKey(cfg.STSRegion, cfg.AliAccessKeyID, cfg.AliAccessKeySecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "STS 客户端初始化失败"})
		return
	}

	req := sts.CreateAssumeRoleRequest()
	req.Scheme = "https"
	req.RoleArn = cfg.AliRAMRoleARN
	req.RoleSessionName = "posterOssUpload"
	req.DurationSeconds = requests.NewInteger(3600)

	resp, err := client.AssumeRole(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("AssumeRole 失败: %v", err)})
		return
	}

	cred := resp.Credentials
	expiration, _ := time.Parse(time.RFC3339, cred.Expiration)

	c.JSON(http.StatusOK, gin.H{
		"access_key_id":     cred.AccessKeyId,
		"access_key_secret": cred.AccessKeySecret,
		"security_token":    cred.SecurityToken,
		"expiration":        expiration.Unix(),
		"region":            cfg.OSSRegion,
		"bucket":            cfg.OSSBucket,
		"prefix":            cfg.OSSUploadPrefix,
		"endpoint":          fmt.Sprintf("https://%s.aliyuncs.com", cfg.OSSRegion),
	})
}
