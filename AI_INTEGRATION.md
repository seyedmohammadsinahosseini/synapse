# 🔌 AI Integration Guide

This platform uses a unified, pluggable AI gateway capable of connecting to any OpenAI-compatible LLM provider or falling back to a deterministic offline mock.

---

## Current Configuration

| Setting | Value |
|---|---|
| **Default Provider** | NVIDIA NIM (OpenAI-compatible) |
| **Default Base URL** | `https://integrate.api.nvidia.com/v1` |
| **Default Model** | `openai/gpt-oss-120b` (Reasoning Model) |
| **Credential Storage** | `.env` file (`AI_API_KEY`) |

### Key Implementation Details
- `max_tokens: 4096` is configured to allocate sufficient token budget for reasoning models to generate internal thought traces and detailed output.
- Structured data extraction (student analysis, weekly plans, essay scoring) leverages `response_format: {"type": "json_object"}`.
- If an API request encounters network failure, invalid key status, or quota exhaustion, it seamlessly switches to the internal **offline mock engine** without interrupting application workflow.

---

## 1. Switching Providers (e.g. OpenAI, DeepSeek, Qwen, Ollama)

You can easily switch to any OpenAI-compatible provider by updating your `.env` file without altering application code:

```env
# Example: DeepSeek
AI_API_KEY="sk-..."
AI_API_BASE_URL="https://api.deepseek.com/v1"
AI_MODEL="deepseek-chat"

# Example: OpenAI Official
AI_API_KEY="sk-..."
AI_API_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"

# Example: Local Ollama
AI_API_KEY="ollama"
AI_API_BASE_URL="http://localhost:11434/v1"
AI_MODEL="llama3.1"
```

---

## 2. Enabling Offline Mock Mode

To disable external API calls completely (e.g., in air-gapped or development environments):

```env
AI_USE_MOCK=1
```

When active, all analysis, grading, and recommendations are handled locally with deterministic mock algorithms.

---

## 3. Core AI Capabilities

| Capability | Backend Method | Output Format |
|---|---|---|
| **Academic Diagnostics & Study Plan** | `analyze_student(profile)` | JSON (`summary`, `strengths`, `weaknesses`, `plan`) |
| **Subjective Essay Grading** | `grade_essay(text, keywords)` | JSON (`score`, `feedback`) |
| **Curated Educational Video Suggestions** | `suggest_videos(subjects, lang)` | JSON List (Aparat API / YouTube API / LLM Search) |
| **Conversational Assistant & Test Builder** | `chat(messages, context)` | Free-form Text / Interactive JSON actions |

---

## 4. Developer Notes

- Always ensure `AI_API_KEY` is kept in your `.env` file and excluded from version control.
- Test endpoint responses with `pytest` or directly via the FastAPI interactive documentation at `http://localhost:8000/docs`.
