package probe

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"testing"
	"time"

	"monitor/internal/config"
)

type fakeExecutor struct {
	mu        sync.Mutex
	failTimes map[string]int
	calls     map[string]int
}

func (f *fakeExecutor) Probe(_ context.Context, t config.Target) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls[t.Name]++
	if f.calls[t.Name] <= f.failTimes[t.Name] {
		return "Fail", errors.New("temporary error")
	}
	return "200 OK", nil
}

func TestRunSingleTargetRetrySuccess(t *testing.T) {
	exe := &fakeExecutor{
		failTimes: map[string]int{"svc": 2},
		calls:     map[string]int{},
	}
	target := config.Target{
		Name:        "svc",
		Address:     "https://example.com",
		Expectation: "200 OK",
		RetryCount:  2,
	}
	result := runSingleTarget(target, 200*time.Millisecond, exe)
	if !result.Success {
		t.Fatalf("expected success, got failure: %+v", result)
	}
	if result.Attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", result.Attempts)
	}
}

func TestRunWithExecutorConcurrentCount(t *testing.T) {
	exe := &fakeExecutor{
		failTimes: map[string]int{},
		calls:     map[string]int{},
	}
	targets := []config.Target{
		{Name: "a", Address: "https://a.com", Expectation: "200 OK"},
		{Name: "b", Address: "https://b.com", Expectation: "200 OK"},
		{Name: "c", Address: "https://c.com", Expectation: "200 OK"},
	}

	results := RunWithExecutor(targets, Options{Timeout: time.Second}, exe)
	if len(results) != len(targets) {
		t.Fatalf("expected %d results, got %d", len(targets), len(results))
	}
}

type errRoundTripper struct{}

func (e errRoundTripper) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("network down")
}

func TestProbeHTTPExpectationFailOnRequestError(t *testing.T) {
	exec := &defaultExecutor{
		httpClient: &http.Client{
			Timeout:   time.Second,
			Transport: errRoundTripper{},
		},
	}
	target := config.Target{
		Name:        "fail-http",
		Address:     "https://example.com",
		Expectation: "Fail",
	}
	status, err := exec.probeHTTP(context.Background(), target)
	if err != nil {
		t.Fatalf("expected nil error when expectation is Fail, got: %v", err)
	}
	if status != "Fail" {
		t.Fatalf("expected status Fail, got %s", status)
	}
}

func TestRunSingleTargetRetryExhausted(t *testing.T) {
	exe := &fakeExecutor{
		failTimes: map[string]int{"svc": 10},
		calls:     map[string]int{},
	}
	target := config.Target{
		Name:        "svc",
		Address:     "https://example.com",
		Expectation: "200 OK",
		RetryCount:  2,
	}
	result := runSingleTarget(target, 200*time.Millisecond, exe)
	if result.Success {
		t.Fatalf("expected failure after retries, got success: %+v", result)
	}
	if result.Attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", result.Attempts)
	}
}

func TestDetectProtocolAndContainsParsing(t *testing.T) {
	if got := DetectProtocol("https://example.com"); got != "HTTP" {
		t.Fatalf("expected HTTP, got %s", got)
	}
	if got := DetectProtocol("localhost:3306"); got != "TCP" {
		t.Fatalf("expected TCP, got %s", got)
	}
	if got := ParseContainsKeyword(`Contains "Go"`); got != "Go" {
		t.Fatalf("expected keyword Go, got %q", got)
	}
	if got := ParseContainsKeyword("200 OK"); got != "" {
		t.Fatalf("expected empty keyword, got %q", got)
	}
}
