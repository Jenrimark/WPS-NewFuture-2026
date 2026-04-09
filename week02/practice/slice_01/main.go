package main

import "fmt"

func main() {
	// 1. 创建包含 1 到 10 的切片
	numbers := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

	// 2. 获取第 3 到第 7 个元素（包含第 7 个）
	_ = numbers[2:7]

	// 3. 在切片末尾添加 11, 12, 13
	numbers = append(numbers, 11, 12, 13)

	// 4. 删除第 5 个元素（索引 4）
	numbers = append(numbers[:4], numbers[5:]...)

	// 5. 所有元素乘以 2
	for i := range numbers {
		numbers[i] *= 2
	}

	// 6. 打印最终切片内容和容量
	fmt.Println("最终切片:", numbers)
	fmt.Println("切片容量:", cap(numbers))
}
