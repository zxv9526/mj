.PHONY: all build run run-web clean test

# 默认编译目标
all: build

# 编译为本地 Termux 二进制文件
build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o mahjong main.go

# 运行终端 TUI 麻将
run: build
	./mahjong

# 运行手机局域网 Web 模式
run-web: build
	./mahjong -web -port 8080

# 清理编译产物
clean:
	rm -f mahjong mahjong.exe

# 运行单元测试
test:
	go test -v ./...
