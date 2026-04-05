package main

import "fmt"

func main() {
	var a, b float64
	var op string
	fmt.Print("请输入两个浮点数和运算符（+ - * /），空格分隔：")
	fmt.Scan(&a, &b, &op)

	switch op {
	case "+":
		fmt.Printf("结果：%g\n", a+b)
	case "-":
		fmt.Printf("结果：%g\n", a-b)
	case "*":
		fmt.Printf("结果：%g\n", a*b)
	case "/":
		if b == 0 {
			fmt.Println("除数不能为零")
		} else {
			fmt.Printf("结果：%g\n", a/b)
		}
	default:
		fmt.Println("运算符应为 +、-、*、/ 之一")
	}
}
