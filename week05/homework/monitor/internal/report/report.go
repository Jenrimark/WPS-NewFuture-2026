package report

import (
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"monitor/internal/probe"
)

type Stats struct {
	Total       int
	Success     int
	Fail        int
	SuccessRate float64
	AvgLatency  time.Duration
	Slowest     probe.Result
	Buckets     map[string]int
}

func BuildStats(results []probe.Result) Stats {
	stats := Stats{
		Total:   len(results),
		Buckets: map[string]int{"<100ms": 0, "100ms-500ms": 0, "500ms-1s": 0, "1s-3s": 0, ">3s": 0},
	}
	if len(results) == 0 {
		return stats
	}

	var totalLatency time.Duration
	slowest := results[0]
	for _, r := range results {
		if r.Success {
			stats.Success++
		} else {
			stats.Fail++
		}
		totalLatency += r.Latency
		if r.Latency > slowest.Latency {
			slowest = r
		}
		stats.Buckets[latencyBucket(r.Latency)]++
	}

	stats.SuccessRate = float64(stats.Success) / float64(stats.Total) * 100
	stats.AvgLatency = totalLatency / time.Duration(stats.Total)
	stats.Slowest = slowest
	return stats
}

func latencyBucket(d time.Duration) string {
	switch {
	case d < 100*time.Millisecond:
		return "<100ms"
	case d < 500*time.Millisecond:
		return "100ms-500ms"
	case d < time.Second:
		return "500ms-1s"
	case d <= 3*time.Second:
		return "1s-3s"
	default:
		return ">3s"
	}
}

func Generate(results []probe.Result, generatedAt time.Time) string {
	stats := BuildStats(results)
	var b strings.Builder
	b.WriteString("=== Service Health Probe Report ===\n")
	b.WriteString(fmt.Sprintf("GeneratedAt: %s\n", generatedAt.Format(time.RFC3339)))
	b.WriteString(fmt.Sprintf("Total Targets: %d\n", stats.Total))
	b.WriteString(fmt.Sprintf("Success: %d\n", stats.Success))
	b.WriteString(fmt.Sprintf("Fail: %d\n", stats.Fail))
	b.WriteString(fmt.Sprintf("Success Rate: %.2f%%\n", stats.SuccessRate))
	b.WriteString(fmt.Sprintf("Average Latency: %s\n", stats.AvgLatency.Truncate(time.Millisecond)))
	b.WriteString("\nLatency Distribution:\n")

	bucketOrder := []string{"<100ms", "100ms-500ms", "500ms-1s", "1s-3s", ">3s"}
	for _, bucket := range bucketOrder {
		b.WriteString(fmt.Sprintf("- %s: %d\n", bucket, stats.Buckets[bucket]))
	}

	if stats.Total > 0 {
		b.WriteString("\nSlowest Target:\n")
		b.WriteString(fmt.Sprintf("- Name: %s\n", stats.Slowest.Target.Name))
		b.WriteString(fmt.Sprintf("- Address: %s\n", stats.Slowest.Target.Address))
		b.WriteString(fmt.Sprintf("- Latency: %s\n", stats.Slowest.Latency.Truncate(time.Millisecond)))
		b.WriteString(fmt.Sprintf("- Success: %v\n", stats.Slowest.Success))
	}

	b.WriteString("\nTarget Details:\n")
	sort.Slice(results, func(i, j int) bool {
		return results[i].Target.Name < results[j].Target.Name
	})
	for _, r := range results {
		b.WriteString(fmt.Sprintf(
			"- [%s] protocol=%s success=%v attempts=%d latency=%s status=%s expectation=%s err=%s\n",
			r.Target.Name,
			r.Protocol,
			r.Success,
			r.Attempts,
			r.Latency.Truncate(time.Millisecond),
			r.Status,
			r.Expectation,
			r.ErrMessage,
		))
	}
	return b.String()
}

func WriteFile(dir string, now time.Time, content string) (string, error) {
	reportDir := dir + string(os.PathSeparator) + "reports"
	if err := os.MkdirAll(reportDir, 0o755); err != nil {
		return "", err
	}

	fileName := fmt.Sprintf("monitor-log-%s.log", now.Format("20060102150405"))
	path := reportDir + string(os.PathSeparator) + fileName
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return path, nil
}
