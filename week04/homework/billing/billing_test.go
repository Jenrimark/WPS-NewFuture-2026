package main

import (
	"math"
	"testing"
)

func floatEq(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

func TestBaseCostBeforeTOU(t *testing.T) {
	cases := []struct {
		name string
		kwh  float64
		want float64
	}{
		{"零与负", 0, 0},
		{"负值按零档", -10, 0},
		{"第一档内", 100, 50},
		{"恰在第一档上限", 200, 100},
		{"第二档内", 300, 200*0.5 + 100*0.8},
		{"恰在第二档上限", 400, 200*0.5 + 200*0.8},
		{"第三档", 500, 200*0.5 + 200*0.8 + 100*1.2},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := BaseCostBeforeTOU(tc.kwh)
			if !floatEq(got, tc.want) {
				t.Fatalf("BaseCostBeforeTOU(%v) = %v, want %v", tc.kwh, got, tc.want)
			}
		})
	}
}

func TestIsPeakTime(t *testing.T) {
	cases := []struct {
		name   string
		h, min int
		peak   bool
	}{
		{"0点低谷", 0, 0, false},
		{"7:59低谷", 7, 59, false},
		{"8:00整点低谷", 8, 0, false},
		{"8:01高峰", 8, 1, true},
		{"14:00高峰", 14, 0, true},
		{"22:00整点高峰", 22, 0, true},
		{"22:01低谷", 22, 1, false},
		{"23:00低谷", 23, 0, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := IsPeakTime(tc.h, tc.min); got != tc.peak {
				t.Errorf("IsPeakTime(%d,%d) = %v, want %v", tc.h, tc.min, got, tc.peak)
			}
		})
	}
}

func TestTOUMultiplier(t *testing.T) {
	if got := TOUMultiplier(14, 0); !floatEq(got, PeakFactor) {
		t.Errorf("TOUMultiplier(14,0) = %v", got)
	}
	if got := TOUMultiplier(22, 0); !floatEq(got, PeakFactor) {
		t.Errorf("TOUMultiplier(22,0) 应为高峰因子，got %v", got)
	}
	if got := TOUMultiplier(22, 1); !floatEq(got, ValleyFactor) {
		t.Errorf("TOUMultiplier(22,1) = %v", got)
	}
	if got := TOUMultiplier(8, 0); !floatEq(got, ValleyFactor) {
		t.Errorf("TOUMultiplier(8,0) = %v", got)
	}
}

func TestFinalBill(t *testing.T) {
	// 400 度阶梯价：200*0.5 + 200*0.8 = 100 + 160 = 260
	base400 := 260.0
	cases := []struct {
		name      string
		kwh       float64
		hour, min int
		want      float64
	}{
		{"400度高峰14:00", 400, 14, 0, base400 * PeakFactor},
		{"400度高峰22:00整点", 400, 22, 0, base400 * PeakFactor},
		{"400度低谷22:01", 400, 22, 1, base400 * ValleyFactor},
		{"100度低谷0点", 100, 0, 0, 50 * ValleyFactor},
		{"100度低谷8:00整点", 100, 8, 0, 50 * ValleyFactor},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := FinalBill(tc.kwh, tc.hour, tc.min)
			if !floatEq(got, tc.want) {
				t.Fatalf("FinalBill(%v,%d,%d) = %v, want %v", tc.kwh, tc.hour, tc.min, got, tc.want)
			}
		})
	}
}

func TestParseClockHHMM(t *testing.T) {
	h, m, err := ParseClockHHMM("14:00")
	if err != nil || h != 14 || m != 0 {
		t.Fatalf("ParseClockHHMM(14:00) = (%d,%d), err=%v", h, m, err)
	}
	h, m, err = ParseClockHHMM("8:30")
	if err != nil || h != 8 || m != 30 {
		t.Fatalf("ParseClockHHMM(8:30) = (%d,%d), err=%v", h, m, err)
	}
	if _, _, err := ParseClockHHMM("bad"); err == nil {
		t.Fatal("expected error")
	}
}

func TestFormatClock(t *testing.T) {
	if FormatClock(8, 5) != "08:05" {
		t.Fatal(FormatClock(8, 5))
	}
}
