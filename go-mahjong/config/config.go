package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Config holds runtime server and Telegram bot settings
type Config struct {
	Port              int
	Rule              string // "GB" or "SICHUAN"
	TelegramBotToken  string
	TelegramAdminIDs  []int64
	PublicURL         string
	EnvLoadedFrom     string
}

// LoadConfig loads configuration from ~/.env, ../.env, .env, or system environment
func LoadConfig() *Config {
	cfg := &Config{
		Port:             8080,
		Rule:             "GB",
		TelegramBotToken: "",
		TelegramAdminIDs: make([]int64, 0),
		PublicURL:        "",
		EnvLoadedFrom:    "系统环境变量",
	}

	// 1. Candidate paths for .env file
	// User requirement: "我将在termux根目录，也就是mj文件夹的上一级创建.env文件"
	// So ../.env (relative to ~/mj) is the highest priority!
	homeDir, _ := os.UserHomeDir()
	candidates := []string{
		"../.env",                        // 上一级目录 (Termux 根目录 ~/ 相对 ~/mj)
		".env",                           // 当前目录
	}
	if homeDir != "" {
		candidates = append(candidates, filepath.Join(homeDir, ".env")) // 绝对家目录 ~/.env
	}

	for _, path := range candidates {
		if fileExists(path) {
			if err := parseEnvFile(path, cfg); err == nil {
				cfg.EnvLoadedFrom = path
				fmt.Printf("\033[1;32m[Config] ✓ 成功从 %s 加载环境配置\033[0m\n", path)
				break
			}
		}
	}

	// 2. Override with system environment variables if set
	if p := os.Getenv("PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			cfg.Port = val
		}
	}
	if r := os.Getenv("MAHJONG_RULE"); r != "" {
		cfg.Rule = strings.ToUpper(r)
	}
	if tok := os.Getenv("TELEGRAM_BOT_TOKEN"); tok != "" {
		cfg.TelegramBotToken = tok
	}
	if admin := os.Getenv("TELEGRAM_ADMIN_ID"); admin != "" {
		cfg.TelegramAdminIDs = parseAdminIDs(admin)
	}
	if url := os.Getenv("PUBLIC_URL"); url != "" {
		cfg.PublicURL = url
	}

	return cfg
}

func fileExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}

func parseEnvFile(filename string, cfg *Config) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Strip inline comments if outside quotes
		if !strings.HasPrefix(val, "\"") && !strings.HasPrefix(val, "'") {
			if idx := strings.Index(val, "#"); idx != -1 {
				val = strings.TrimSpace(val[:idx])
			}
		}

		// Strip surrounding quotes
		if len(val) >= 2 {
			if (strings.HasPrefix(val, "\"") && strings.HasSuffix(val, "\"")) ||
				(strings.HasPrefix(val, "'") && strings.HasSuffix(val, "'")) {
				val = val[1 : len(val)-1]
			}
		}

		switch key {
		case "PORT":
			if p, err := strconv.Atoi(val); err == nil && p > 0 {
				cfg.Port = p
			}
		case "MAHJONG_RULE", "RULE":
			cfg.Rule = strings.ToUpper(val)
		case "TELEGRAM_BOT_TOKEN", "BOT_TOKEN", "TG_BOT_TOKEN":
			cfg.TelegramBotToken = val
		case "TELEGRAM_ADMIN_ID", "ADMIN_ID", "TG_ADMIN_ID", "ADMIN_IDS":
			cfg.TelegramAdminIDs = parseAdminIDs(val)
		case "PUBLIC_URL", "CLOUDFLARE_URL", "TUNNEL_URL":
			cfg.PublicURL = val
		}
	}

	return scanner.Err()
}

func parseAdminIDs(raw string) []int64 {
	var ids []int64
	for _, part := range strings.Split(raw, ",") {
		clean := strings.TrimSpace(part)
		if id, err := strconv.ParseInt(clean, 10, 64); err == nil && id != 0 {
			ids = append(ids, id)
		}
	}
	return ids
}

// HasAdmin checks if a specific Telegram user ID is an authorized admin
func (c *Config) HasAdmin(userID int64) bool {
	if len(c.TelegramAdminIDs) == 0 {
		return false
	}
	for _, id := range c.TelegramAdminIDs {
		if id == userID {
			return true
		}
	}
	return false
}
