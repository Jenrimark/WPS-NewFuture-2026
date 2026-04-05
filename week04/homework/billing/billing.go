package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// 阶梯与单价（元/度）
const (
	Tier1UpperKWh = 200.0
	Tier2UpperKWh = 400.0
	PriceTier1    = 0.5
	PriceTier2    = 0.8
	PriceTier3    = 1.2
)

// 峰谷时段（按整点小时判断，与题目描述一致）
const (
	PeakStartHour = 8
	PeakEndHour   = 22 // [8, 22) 为高峰；22 点起至次日 8 点前为低谷
	PeakFactor    = 1.10
	ValleyFactor  = 0.80
)

const BillingRuleVersion = "2026.04-billing-v1"

var systemInitTime string

func init() {
	systemInitTime = time.Now().Format("2006-01-02 15:04:05")
	fmt.Println("========== 电费计费系统 ==========")
	fmt.Printf("计费规则版本号：%s\n", BillingRuleVersion)
	fmt.Printf("系统初始化时间：%s\n", systemInitTime)
	fmt.Println("==================================")
}

// BaseCostBeforeTOU 按阶梯电价计算峰谷调节前的电费（元）
func BaseCostBeforeTOU(kwh float64) float64 {
	if kwh <= 0 {
		return 0
	}
	u := kwh
	var cost float64
	if u <= Tier1UpperKWh {
		cost = u * PriceTier1
	} else if u <= Tier2UpperKWh {
		cost = Tier1UpperKWh*PriceTier1 + (u-Tier1UpperKWh)*PriceTier2
	} else {
		mid := Tier2UpperKWh - Tier1UpperKWh
		cost = Tier1UpperKWh*PriceTier1 + mid*PriceTier2 + (u-Tier2UpperKWh)*PriceTier3
	}
	return cost
}

// IsPeakHour 判断整点是否处于高峰时段 [8, 22)
func IsPeakHour(hour int) bool {
	return hour >= PeakStartHour && hour < PeakEndHour
}

// TOUMultiplier 返回峰谷调节因子（乘在阶梯总价上）
func TOUMultiplier(hour int) float64 {
	if IsPeakHour(hour) {
		return PeakFactor
	}
	return ValleyFactor
}

// FinalBill 最终电费：阶梯总价 × 峰谷因子
func FinalBill(kwh float64, hour int) float64 {
	return BaseCostBeforeTOU(kwh) * TOUMultiplier(hour)
}

// ParseClockHHMM 解析 "H:MM" 或 "HH:MM"，返回小时与分钟；小时范围 [0,23]
func ParseClockHHMM(s string) (hour, minute int, err error) {
	s = strings.TrimSpace(s)
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("时段格式应为 HH:MM")
	}
	h, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	m, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil {
		return 0, 0, fmt.Errorf("时段必须为数字")
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, 0, fmt.Errorf("小时或分钟超出范围")
	}
	return h, m, nil
}

// FormatClock 将解析结果格式化为 HH:MM（用于账单展示）
func FormatClock(hour, minute int) string {
	return fmt.Sprintf("%02d:%02d", hour, minute)
}

func main() {
	for {
		var usage float64
		fmt.Print("请输入用电量（度，如 400.00）：")
		if _, err := fmt.Scanln(&usage); err != nil {
			fmt.Println("读取用电量失败，请重试。")
			continue
		}
		if usage < 0 {
			fmt.Println("用电量不能为负数，请重新输入。")
			continue
		}

		var timeInput string
		fmt.Print("请输入用电时段（如 14:00）：")
		if _, err := fmt.Scanln(&timeInput); err != nil {
			fmt.Println("读取时段失败，请重试。")
			continue
		}

		h, m, err := ParseClockHHMM(timeInput)
		if err != nil {
			fmt.Printf("时段无效：%v\n", err)
			continue
		}

		clockLabel := FormatClock(h, m)
		total := FinalBill(usage, h)

		fmt.Println("--- 账单明细 ---")
		fmt.Printf("用电总量：%.2f 度\n", usage)
		fmt.Printf("当前时段：%s 点\n", clockLabel)
		fmt.Printf("最终电费：%.2f 元\n", total)
		fmt.Println()
	}
}
