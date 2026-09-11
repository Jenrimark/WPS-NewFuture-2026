package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigValidate(t *testing.T) {
	valid := Config{
		Targets: []Target{
			{
				Name:        "svc",
				Address:     "https://example.com",
				Expectation: "200 OK",
				RetryCount:  3,
			},
		},
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid config, got error: %v", err)
	}
}

func TestConfigValidateRetryRange(t *testing.T) {
	cfg := Config{
		Targets: []Target{
			{
				Name:        "svc",
				Address:     "https://example.com",
				Expectation: "200 OK",
				RetryCount:  4,
			},
		},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected retry range validation error, got nil")
	}
}

func TestLoadSuccess(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	content := `{
  "targets": [
    {
      "name": "svc",
      "address": "https://example.com",
      "expectation": "200 OK",
      "retry_count": 1
    }
  ]
}`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write temp config failed: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("expected load success, got %v", err)
	}
	if len(cfg.Targets) != 1 {
		t.Fatalf("expected 1 target, got %d", len(cfg.Targets))
	}
	if cfg.Targets[0].RetryCount != 1 {
		t.Fatalf("expected retry_count 1, got %d", cfg.Targets[0].RetryCount)
	}
}

func TestLoadInvalidJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.json")
	if err := os.WriteFile(path, []byte("{invalid json"), 0o644); err != nil {
		t.Fatalf("write invalid json failed: %v", err)
	}

	if _, err := Load(path); err == nil {
		t.Fatal("expected parse error, got nil")
	}
}
