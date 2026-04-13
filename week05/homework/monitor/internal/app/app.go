package app

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"time"

	"monitor/internal/config"
	"monitor/internal/probe"
	"monitor/internal/report"
)

type CLIOptions struct {
	ConfigPath string
	TimeoutSec int
	Verbose    bool
}

func ParseFlags(args []string) (CLIOptions, error) {
	fs := flag.NewFlagSet("monitor", flag.ContinueOnError)
	fs.SetOutput(io.Discard)

	configPath := fs.String("config", "config.json", "path to config file")
	timeoutSec := fs.Int("timeout", 3, "single probe timeout in seconds")
	verbose := fs.Bool("v", false, "verbose output")

	if err := fs.Parse(args); err != nil {
		return CLIOptions{}, err
	}

	return CLIOptions{
		ConfigPath: *configPath,
		TimeoutSec: *timeoutSec,
		Verbose:    *verbose,
	}, nil
}

func Run(args []string, stdout io.Writer, stderr io.Writer, now func() time.Time, getwd func() (string, error)) int {
	opts, err := ParseFlags(args)
	if err != nil {
		fmt.Fprintf(stderr, "parse args failed: %v\n", err)
		return 1
	}
	if opts.TimeoutSec <= 0 {
		fmt.Fprintln(stderr, "timeout must be greater than 0")
		return 1
	}

	cfg, err := config.Load(opts.ConfigPath)
	if err != nil {
		fmt.Fprintf(stderr, "load config failed: %v\n", err)
		return 1
	}

	results := probe.Run(cfg.Targets, probe.Options{
		Timeout: time.Duration(opts.TimeoutSec) * time.Second,
		Verbose: opts.Verbose,
	})

	t := now()
	terminalReport := report.GenerateTerminal(results, t, 56)
	fmt.Fprintln(stdout, terminalReport)

	wd, err := getwd()
	if err != nil {
		fmt.Fprintf(stderr, "get current directory failed: %v\n", err)
		return 1
	}

	fileReport := report.Generate(results, t)
	reportPath, err := report.WriteFile(wd, t, fileReport)
	if err != nil {
		fmt.Fprintf(stderr, "write report failed: %v\n", err)
		return 1
	}
	fmt.Fprintf(stdout, "report saved to %s\n", reportPath)
	return 0
}

func ValidateOptions(opts CLIOptions) error {
	if opts.TimeoutSec <= 0 {
		return errors.New("timeout must be greater than 0")
	}
	return nil
}
