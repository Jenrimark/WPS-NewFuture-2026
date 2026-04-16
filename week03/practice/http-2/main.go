package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

const (
	port     = ":8080"
	todosURL = "https://jsonplaceholder.typicode.com/todos"
)

type Todo struct {
	Title     string `json:"title"`
	UserID    int    `json:"userId"`
	ID        int    `json:"id"`
	Completed bool   `json:"completed"`
}

var (
	todosCache []Todo
	cacheMu    sync.RWMutex
)

func fetchTodos() ([]Todo, error) {
	cacheMu.RLock()
	if len(todosCache) > 0 {
		copied := make([]Todo, len(todosCache))
		copy(copied, todosCache)
		cacheMu.RUnlock()
		return copied, nil
	}
	cacheMu.RUnlock()

	resp, err := http.Get(todosURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("request failed: %d %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var todos []Todo
	if err = json.NewDecoder(resp.Body).Decode(&todos); err != nil {
		return nil, err
	}

	cacheMu.Lock()
	todosCache = todos
	cacheMu.Unlock()

	return todos, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func todoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"message": "method not allowed"})
		return
	}

	path := r.URL.Path

	if path == "/api/todo/list" {
		todos, err := fetchTodos()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, todos)
		return
	}

	if strings.HasPrefix(path, "/api/todo/detail/") {
		idStr := strings.TrimPrefix(path, "/api/todo/detail/")
		todoID, err := strconv.Atoi(idStr)
		if err != nil || todoID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "todoid must be a positive integer"})
			return
		}

		todos, err := fetchTodos()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		for _, todo := range todos {
			if todo.ID == todoID {
				writeJSON(w, http.StatusOK, todo)
				return
			}
		}

		writeJSON(w, http.StatusNotFound, map[string]string{"message": "todo not found"})
		return
	}

	writeJSON(w, http.StatusNotFound, map[string]string{"message": "route not found"})
}

func main() {
	http.HandleFunc("/api/todo/list", todoHandler)
	http.HandleFunc("/api/todo/detail/", todoHandler)

	fmt.Println("todo server running at http://localhost:8080")
	if err := http.ListenAndServe(port, nil); err != nil {
		fmt.Printf("server start failed: %v\n", err)
	}
}
