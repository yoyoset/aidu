# 5. 核心模块：自适应策略 (Module D: Adaptive Strategy)

## 5.1 策略概要
通过动态配置 (Dynamic Configuration) 适配不同的网络环境与模型能力。

## 5.2 策略定义 (Strategy Profiles)
| Profile | 并发/超时 | 错误处理 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **🛡️ Robust** | 串行 / 60s | 递归重试 + 修复 | DeepSeek R1, 不稳定网络 |
| **⚖️ Balanced** | 3并发 / 30s | 标准重试 (1x) | GPT-4o, Claude 3.5 |
| **⚡ Turbo** | 5并发 / 15s | 快速失败 (Fail Fast) | Gemini 1.5 Flash |

## 5.3 降级机制 (Degradation)
- **自动降级**: 检测到连续 JSON Parse Error 或 Timeout 时，自动降级至 Robust 模式。
