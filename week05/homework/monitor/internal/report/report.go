package report

import (
	"fmt"
	"os"
	"sort"
	"strings"
	"time"
	"unicode"

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
	return generate(results, generatedAt, 0)
}

func GenerateTerminal(results []probe.Result, generatedAt time.Time, maxErrorWidth int) string {
	return generate(results, generatedAt, maxErrorWidth)
}

func generate(results []probe.Result, generatedAt time.Time, maxErrorWidth int) string {
	stats := BuildStats(results)
	sorted := append([]probe.Result(nil), results...)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Latency == sorted[j].Latency {
			return sorted[i].Target.Name < sorted[j].Target.Name
		}
		return sorted[i].Latency > sorted[j].Latency
	})

	var b strings.Builder
	b.WriteString("=== SERVICE HEALTH PROBE REPORT ===\n")
	b.WriteString(fmt.Sprintf("Generated At : %s\n", generatedAt.Format(time.RFC3339)))
	b.WriteString(fmt.Sprintf("Total Targets: %d | Success: %d | Fail: %d | Success Rate: %.2f%%\n", stats.Total, stats.Success, stats.Fail, stats.SuccessRate))
	b.WriteString(fmt.Sprintf("Avg Latency : %s\n", stats.AvgLatency.Truncate(time.Millisecond)))
	b.WriteString("\n[Latency Distribution]\n")

	bucketOrder := []string{"<100ms", "100ms-500ms", "500ms-1s", "1s-3s", ">3s"}
	for _, bucket := range bucketOrder {
		b.WriteString(fmt.Sprintf("  - %-10s : %d\n", bucket, stats.Buckets[bucket]))
	}

	if stats.Total > 0 {
		slowestMark := "FAIL"
		if stats.Slowest.Success {
			slowestMark = "OK"
		}
		b.WriteString("\n[Slowest Target]\n")
		b.WriteString(fmt.Sprintf("  %s (%s) latency=%s status=%s\n", stats.Slowest.Target.Name, stats.Slowest.Target.Address, stats.Slowest.Latency.Truncate(time.Millisecond), slowestMark))
	}

	b.WriteString("\n[Target Details - sorted by latency desc]\n")
	b.WriteString("  ---------------------------------------------------------------------------------------------------------------\n")
	b.WriteString("  TARGET            | PROTO | RESULT | ATTEMPTS | LATENCY  | STATUS        | EXPECTATION     | ERROR\n")
	b.WriteString("  ---------------------------------------------------------------------------------------------------------------\n")
	for _, r := range sorted {
		resultText := "OK"
		if !r.Success {
			resultText = "FAIL"
		}
		errText := "-"
		if r.ErrMessage != "" {
			errText = r.ErrMessage
		}
		if maxErrorWidth > 0 {
			errText = truncateDisplay(errText, maxErrorWidth)
		}
		b.WriteString("  ")
		b.WriteString(padDisplay(r.Target.Name, 16))
		b.WriteString(" | ")
		b.WriteString(padDisplay(r.Protocol, 5))
		b.WriteString(" | ")
		b.WriteString(padDisplay(resultText, 6))
		b.WriteString(" | ")
		b.WriteString(padDisplay(fmt.Sprintf("%d", r.Attempts), 8))
		b.WriteString(" | ")
		b.WriteString(padDisplay(r.Latency.Truncate(time.Millisecond).String(), 8))
		b.WriteString(" | ")
		b.WriteString(padDisplay(r.Status, 13))
		b.WriteString(" | ")
		b.WriteString(padDisplay(r.Expectation, 15))
		b.WriteString(" | ")
		b.WriteString(errText)
		b.WriteString("\n")
	}
	b.WriteString("  ---------------------------------------------------------------------------------------------------------------\n")
	return b.String()
}

func padDisplay(s string, width int) string {
	w := displayWidth(s)
	if w >= width {
		return s
	}
	return s + strings.Repeat(" ", width-w)
}

func displayWidth(s string) int {
	total := 0
	for _, r := range s {
		total += runeDisplayWidth(r)
	}
	return total
}

func runeDisplayWidth(r rune) int {
	if unicode.Is(unicode.Mn, r) {
		return 0
	}
	if isWideRune(r) {
		return 2
	}
	return 1
}

func isWideRune(r rune) bool {
	switch {
	case r >= 0x1100 && r <= 0x115F: // Hangul Jamo
		return true
	case r >= 0x2E80 && r <= 0xA4CF: // CJK ... Yi
		return true
	case r >= 0xAC00 && r <= 0xD7A3: // Hangul Syllables
		return true
	case r >= 0xF900 && r <= 0xFAFF: // CJK Compatibility Ideographs
		return true
	case r >= 0xFE10 && r <= 0xFE6F: // Vertical forms + CJK Compatibility Forms
		return true
	case r >= 0xFF00 && r <= 0xFF60: // Fullwidth Forms
		return true
	case r >= 0xFFE0 && r <= 0xFFE6: // Fullwidth symbol variants
		return true
	default:
		return false
	}
}

func truncateDisplay(s string, width int) string {
	if width <= 0 {
		return s
	}
	if displayWidth(s) <= width {
		return s
	}
	if width <= 3 {
		return strings.Repeat(".", width)
	}

	var b strings.Builder
	current := 0
	for _, r := range s {
		w := runeDisplayWidth(r)
		if current+w > width-3 {
			break
		}
		b.WriteRune(r)
		current += w
	}
	b.WriteString("...")
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
