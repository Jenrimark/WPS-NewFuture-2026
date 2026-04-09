package main

import "fmt"

func main() {
	slice1 := []int{1, 2, 3, 4}
	slice2 := []int{3, 4, 5, 6}

	combinedSlice := append(slice1, slice2...)

	seen := make(map[int]bool)
	uniqueSlice := make([]int, 0, len(combinedSlice))

	for _, num := range combinedSlice {
		if !seen[num] {
			seen[num] = true
			uniqueSlice = append(uniqueSlice, num)
		}
	}

	fmt.Println(uniqueSlice)
}
