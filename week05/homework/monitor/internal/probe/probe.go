package probe

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"monitor/internal/config"
)

type Result struct {
	Target      config.Target
	Protocol    string
	Success     bool
	Latency     time.Duration
	Attempts    int
	Status      string
	ErrMessage  string
	FinishedAt  time.Time
	Expectation string
}

type Options struct {
	Timeout time.Duration
	Verbose bool
}

type Executor interface {
	Probe(ctx context.Context, t config.Target) (status string, err error)
}

type defaultExecutor struct {
	httpClient *http.Client
}

func NewDefaultExecutor(timeout time.Duration) *defaultExecutor {
	return &defaultExecutor{
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (e *defaultExecutor) Probe(ctx context.Context, t config.Target) (string, error) {
	time.Sleep(1 * time.Second)

	if IsHTTP(t.Address) {
		return e.probeHTTP(ctx, t)
	}
	return e.probeTCP(ctx, t)
}

func (e *defaultExecutor) probeHTTP(ctx context.Context, t config.Target) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.Address, nil)
	if err != nil {
		return "", err
	}
	// Add common browser-like headers to reduce bot-style blocking on some sites.
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Connection", "close")

	resp, err := e.httpClient.Do(req)
	if err != nil {
		if strings.EqualFold(strings.TrimSpace(t.Expectation), "fail") {
			return "Fail", nil
		}
		return "", err
	}
	defer resp.Body.Close()

	status := resp.Status
	if strings.Contains(strings.ToLower(t.Expectation), "contains ") {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return status, readErr
		}
		keyword := ParseContainsKeyword(t.Expectation)
		if keyword == "" {
			return status, errors.New("invalid contains expectation")
		}
		if !strings.Contains(string(body), keyword) {
			return status, fmt.Errorf("body does not contain %q", keyword)
		}
		return status, nil
	}

	if strings.EqualFold(strings.TrimSpace(t.Expectation), "fail") {
		return status, fmt.Errorf("expected failure but got %s", status)
	}

	if !strings.Contains(status, t.Expectation) {
		return status, fmt.Errorf("expected %q, got %q", t.Expectation, status)
	}
	return status, nil
}

func (e *defaultExecutor) probeTCP(ctx context.Context, t config.Target) (string, error) {
	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, "tcp", t.Address)
	if err != nil {
		if strings.EqualFold(strings.TrimSpace(t.Expectation), "fail") {
			return "Fail", nil
		}
		return "Fail", err
	}
	defer conn.Close()

	if strings.EqualFold(strings.TrimSpace(t.Expectation), "fail") {
		return "Connected", errors.New("expected failure but connected")
	}

	return "Connected", nil
}

func Run(targets []config.Target, opts Options) []Result {
	executor := NewDefaultExecutor(opts.Timeout)
	return RunWithExecutor(targets, opts, executor)
}

func RunWithExecutor(targets []config.Target, opts Options, executor Executor) []Result {
	resultsCh := make(chan Result, len(targets))
	var wg sync.WaitGroup

	for _, t := range targets {
		target := t
		wg.Add(1)
		go func() {
			defer wg.Done()
			result := runSingleTarget(target, opts.Timeout, executor)
			if opts.Verbose {
				fmt.Printf(
					"[probe] target=%s protocol=%s success=%v attempts=%d latency=%s status=%s err=%s\n",
					result.Target.Name,
					result.Protocol,
					result.Success,
					result.Attempts,
					result.Latency.Truncate(time.Millisecond),
					result.Status,
					result.ErrMessage,
				)
			}
			resultsCh <- result
		}()
	}

	wg.Wait()
	close(resultsCh)

	results := make([]Result, 0, len(targets))
	for r := range resultsCh {
		results = append(results, r)
	}
	return results
}

func runSingleTarget(t config.Target, timeout time.Duration, executor Executor) Result {
	attempts := 0
	maxAttempts := 1 + t.RetryCount
	startOverall := time.Now()
	lastStatus := ""
	var lastErr error

	for attempts < maxAttempts {
		attempts++
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		status, err := executor.Probe(ctx, t)
		cancel()

		lastStatus = status
		lastErr = err
		if err == nil {
			return Result{
				Target:      t,
				Protocol:    DetectProtocol(t.Address),
				Success:     true,
				Latency:     time.Since(startOverall),
				Attempts:    attempts,
				Status:      status,
				FinishedAt:  time.Now(),
				Expectation: t.Expectation,
			}
		}
	}

	return Result{
		Target:      t,
		Protocol:    DetectProtocol(t.Address),
		Success:     false,
		Latency:     time.Since(startOverall),
		Attempts:    attempts,
		Status:      lastStatus,
		ErrMessage:  lastErr.Error(),
		FinishedAt:  time.Now(),
		Expectation: t.Expectation,
	}
}

func IsHTTP(addr string) bool {
	return strings.HasPrefix(addr, "http://") || strings.HasPrefix(addr, "https://")
}

func DetectProtocol(addr string) string {
	if IsHTTP(addr) {
		return "HTTP"
	}
	return "TCP"
}

func ParseContainsKeyword(expectation string) string {
	exp := strings.TrimSpace(expectation)
	if !strings.HasPrefix(strings.ToLower(exp), "contains ") {
		return ""
	}
	keyword := strings.TrimSpace(exp[len("contains "):])
	return strings.Trim(keyword, "\"")
}
