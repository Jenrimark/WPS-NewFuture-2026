package main

import "fmt"

func mostFrequentChar(s string) (rune, int) {
	counts := make(map[rune]int)
	var maxChar rune
	maxCount := 0

	for _, ch := range s {
		counts[ch]++
		if counts[ch] > maxCount {
			maxCount = counts[ch]
			maxChar = ch
		}
	}

	return maxChar, maxCount
}

func main() {
	input := "a1b2c3a1b2a9"
	ch, count := mostFrequentChar(input)
	fmt.Printf("字符串: %s\n", input)
	fmt.Printf("出现次数最多的字符: %c, 次数: %d\n", ch, count)
}
