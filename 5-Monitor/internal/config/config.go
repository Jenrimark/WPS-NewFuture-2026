package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
)

type Config struct {
	Targets []Target `json:"targets"`
}

type Target struct {
	Name        string `json:"name"`
	Address     string `json:"address"`
	Expectation string `json:"expectation"`
	RetryCount  int    `json:"retry_count,omitempty"`
}

func Load(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c Config) Validate() error {
	if len(c.Targets) == 0 {
		return errors.New("config.targets cannot be empty")
	}

	for i, target := range c.Targets {
		if target.Name == "" {
			return fmt.Errorf("targets[%d].name cannot be empty", i)
		}
		if target.Address == "" {
			return fmt.Errorf("targets[%d].address cannot be empty", i)
		}
		if target.Expectation == "" {
			return fmt.Errorf("targets[%d].expectation cannot be empty", i)
		}
		if target.RetryCount < 0 || target.RetryCount > 3 {
			return fmt.Errorf("targets[%d].retry_count must be within [0,3]", i)
		}
	}

	return nil
}
