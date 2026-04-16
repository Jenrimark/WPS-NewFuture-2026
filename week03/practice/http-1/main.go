package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const todosURL = "https://jsonplaceholder.typicode.com/todos"

type Todo struct {
	Title     string `json:"title"`
	UserID    int    `json:"userId"`
	ID        int    `json:"id"`
	Completed bool   `json:"completed"`
}

func main() {
	client := &http.Client{}

	req, err := http.NewRequest(http.MethodGet, todosURL, nil)
	if err != nil {
		fmt.Printf("build request failed: %v\n", err)
		return
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("request failed: %d %s\n", resp.StatusCode, string(body))
		return
	}

	var todos []Todo
	if err = json.NewDecoder(resp.Body).Decode(&todos); err != nil {
		fmt.Printf("parse todos failed: %v\n", err)
		return
	}

	for _, todo := range todos {
		fmt.Printf(
			"title: %s, userId: %d, id: %d, completed: %t\n",
			todo.Title,
			todo.UserID,
			todo.ID,
			todo.Completed,
		)
	}
}
