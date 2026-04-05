package main

import "fmt"

func Divide(a, b float64) float64 {
	if b == 0 {
		panic("除数不能为零")
	}
	return a / b
}

func callDivide(a, b float64) (q float64, err string) {
	defer func() {
		if e := recover(); e != nil {
			err = fmt.Sprint(e)
		}
	}()
	q = Divide(a, b)
	return
}

func main() {
	for _, p := range [][2]float64{{10, 2}, {10, 0}} {
		a, b := p[0], p[1]
		q, err := callDivide(a, b)
		if err != "" {
			fmt.Printf("%g/%g错误：%s\n", a, b, err)
			continue
		}
		fmt.Printf("%g/%g=%g\n", a, b, q)
	}
}
