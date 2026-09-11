package report

import (
	"strings"
	"testing"
	"time"

	"monitor/internal/config"
	"monitor/internal/probe"
)

func TestBuildStats(t *testing.T) {
	results := []probe.Result{
		{Target: config.Target{Name: "ok"}, Success: true, Latency: 200 * time.Millisecond},
		{Target: config.Target{Name: "fail"}, Success: false, Latency: 2 * time.Second},
	}

	stats := BuildStats(results)
	if stats.Total != 2 || stats.Success != 1 || stats.Fail != 1 {
		t.Fatalf("unexpected stats: %+v", stats)
	}
	if stats.Slowest.Target.Name != "fail" {
		t.Fatalf("expected slowest target fail, got %s", stats.Slowest.Target.Name)
	}
}

func TestGenerateContainsFields(t *testing.T) {
	results := []probe.Result{
		{
			Target:      config.Target{Name: "demo", Address: "https://example.com"},
			Protocol:    "HTTP",
			Success:     true,
			Attempts:    1,
			Latency:     150 * time.Millisecond,
			Status:      "200 OK",
			Expectation: "200 OK",
		},
	}
	reportText := Generate(results, time.Now())
	if !strings.Contains(reportText, "SERVICE HEALTH PROBE REPORT") {
		t.Fatal("report title not found")
	}
	if !strings.Contains(reportText, "demo") {
		t.Fatal("target detail not found")
	}
}

func TestGenerateTerminalTruncatesErrorOnly(t *testing.T) {
	longErr := "Get \"https://example.com/very/long/path/that/should/be/truncated\": context deadline exceeded"
	results := []probe.Result{
		{
			Target:      config.Target{Name: "demo", Address: "https://example.com"},
			Protocol:    "HTTP",
			Success:     false,
			Attempts:    1,
			Latency:     150 * time.Millisecond,
			Status:      "",
			Expectation: "200 OK",
			ErrMessage:  longErr,
		},
	}

	terminalReport := GenerateTerminal(results, time.Now(), 20)
	if !strings.Contains(terminalReport, "...") {
		t.Fatal("expected truncated error in terminal report")
	}

	fileReport := Generate(results, time.Now())
	if !strings.Contains(fileReport, longErr) {
		t.Fatal("expected full error in file report")
	}
}
