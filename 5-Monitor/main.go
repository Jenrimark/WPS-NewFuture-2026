package main

import (
	"os"
	"time"

	"monitor/internal/app"
)

func main() {
	code := app.Run(os.Args[1:], os.Stdout, os.Stderr, time.Now, os.Getwd)
	os.Exit(code)
}
