package config

import "testing"

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
