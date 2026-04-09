package main

import (
	"encoding/json"
	"fmt"
)

type Person struct {
	Name  string `json:"name"`
	Age   int    `json:"age"`
	Email string `json:"email"`
}

func main() {
	jsonStr := `{"name":"Jane Smith","age":25,"email":"janesmith@example.com"}`

	var p Person
	err := json.Unmarshal([]byte(jsonStr), &p)
	if err != nil {
		fmt.Println("反序列化失败:", err)
		return
	}

	fmt.Println("Name:", p.Name)
	fmt.Println("Age:", p.Age)
	fmt.Println("Email:", p.Email)

	jsonBytes, err := json.Marshal(p)
	if err != nil {
		fmt.Println("序列化失败:", err)
		return
	}

	fmt.Println("序列化后 JSON:", string(jsonBytes))
}
