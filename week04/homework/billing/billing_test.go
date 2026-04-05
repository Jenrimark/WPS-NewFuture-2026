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

func TestIsPeakHour(t *testing.T) {
	cases := []struct {
		hour int
		peak bool
	}{
		{0, false},
		{7, false},
		{8, true},
		{14, true},
		{21, true},
		{22, false},
		{23, false},
	}
	for _, tc := range cases {
		if got := IsPeakHour(tc.hour); got != tc.peak {
			t.Errorf("IsPeakHour(%d) = %v, want %v", tc.hour, got, tc.peak)
		}
	}
}

func TestTOUMultiplier(t *testing.T) {
	if got := TOUMultiplier(14); !floatEq(got, PeakFactor) {
		t.Errorf("TOUMultiplier(14) = %v", got)
	}
	if got := TOUMultiplier(22); !floatEq(got, ValleyFactor) {
		t.Errorf("TOUMultiplier(22) = %v", got)
	}
}

func TestFinalBill(t *testing.T) {
	// 400 度阶梯价：200*0.5 + 200*0.8 = 100 + 160 = 260
	base400 := 260.0
	cases := []struct {
		name string
		kwh  float64
		hour int
		want float64
	}{
		{"400度高峰14点", 400, 14, base400 * PeakFactor},
		{"400度低谷22点", 400, 22, base400 * ValleyFactor},
		{"100度低谷0点", 100, 0, 50 * ValleyFactor},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := FinalBill(tc.kwh, tc.hour)
			if !floatEq(got, tc.want) {
				t.Fatalf("FinalBill(%v,%d) = %v, want %v", tc.kwh, tc.hour, got, tc.want)
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
