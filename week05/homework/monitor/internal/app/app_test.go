package app

import "testing"

func TestParseFlagsDefaultValues(t *testing.T) {
	opts, err := ParseFlags([]string{})
	if err != nil {
		t.Fatalf("expected no parse error, got %v", err)
	}
	if opts.ConfigPath != "config.json" {
		t.Fatalf("expected default config.json, got %s", opts.ConfigPath)
	}
	if opts.TimeoutSec != 3 {
		t.Fatalf("expected default timeout 3, got %d", opts.TimeoutSec)
	}
	if opts.Verbose {
		t.Fatal("expected default verbose false")
	}
}

func TestParseFlagsOverrideValues(t *testing.T) {
	opts, err := ParseFlags([]string{"--config", "custom.json", "--timeout", "12", "-v"})
	if err != nil {
		t.Fatalf("expected no parse error, got %v", err)
	}
	if opts.ConfigPath != "custom.json" {
		t.Fatalf("expected custom config path, got %s", opts.ConfigPath)
	}
	if opts.TimeoutSec != 12 {
		t.Fatalf("expected timeout 12, got %d", opts.TimeoutSec)
	}
	if !opts.Verbose {
		t.Fatal("expected verbose true")
	}
}

func TestValidateOptionsTimeout(t *testing.T) {
	if err := ValidateOptions(CLIOptions{TimeoutSec: 0}); err == nil {
		t.Fatal("expected timeout validation error, got nil")
	}
	if err := ValidateOptions(CLIOptions{TimeoutSec: 1}); err != nil {
		t.Fatalf("expected valid timeout, got %v", err)
	}
}
