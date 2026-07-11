# Model Selection

The deterministic fallback order is:

| Priority | Role | Provider and model |
|---|---|---|
| 1 | Judge/Advisor | OpenAI `openai/gpt-5.6-sol` |
| 2 | Judge/Advisor | Claude CLI `fable` |
| 3 | Judge/Advisor | OpenRouter `openrouter/z-ai/glm-5.2@preset/default` |

Fusion panels use:

| Panel | Provider and model |
|---|---|
| MI | `openrouter/xiaomi/mimo-v2.5-pro@preset/default` |
| DS | `openrouter/deepseek/deepseek-v4-pro@preset/default` |
| MM | `openrouter/minimax/minimax-m3@preset/default` |

Override Sol or GLM for controlled testing with
`LOCAL_CONSENSUS_SOL_MODEL` or `LOCAL_CONSENSUS_GLM_MODEL`. Do not override
production model selection without a task-specific reason.
