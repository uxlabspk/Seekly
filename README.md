<div align="center">

# Seekly

**Local-first, evidence-backed CLI research agent**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue.svg)](https://www.typescriptlang.org)

[Features](#features) · [Quick Start](#quick-start) · [Commands](#commands) · [Configuration](#configuration)

---

</div>

Ask a question. Get a research report with sources, citations, and evidence — all powered by your local LLM.

```
$ seekly

             ⬡ Seekly v0.1.0
       ────────────────────────────────────────────────

  Ask anything — I'll research it for you

  ╭───────────────────────────────────────────────────────╮
  ❯ what are tokenizers?▌                                 │
  ╰───────────────────────────────────────────────────────╯

  Enter to submit · Ctrl+C to exit


             ⬡ Seekly v0.1.0
       ────────────────────────────────────────────────

  what are tokenizers?

  ✓ Planning
  ◆ Searching 3 sources
  ○ Retrieving
  ○ Extracting
  ○ Verifying
  ○ Synthesizing

  [████████████░░░░░░░░░░░░░░░░░░] 33%  00:12
```

## Features

| Feature              | Details                                                   |
| -------------------- | --------------------------------------------------------- |
| **Local-first**      | Runs on your machine via llama.cpp — no API keys required |
| **Evidence-backed**  | Searches the web, extracts content, cites sources         |
| **Multi-citation**   | APA, MLA, Chicago, IEEE, Harvard, Vancouver styles        |
| **Research history** | All sessions stored in SQLite, revisit anytime            |
| **Streaming output** | Watch the report generate in real-time                    |
| **Diagnostics**      | `seekly doctor` checks your setup in one command          |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USER/seekly.git
cd seekly
npm install

# 2. Start llama.cpp with a model
llama-server -m ./models/model.gguf --port 8080

# 3. Run research
npm run seekly -- research "What are the security implications of WebAssembly?"

or simply start the interative TUI
npm start seekly
```

Or set it up properly:

```bash
cp .env.example .env
# Edit .env with your settings

npm run seekly
# Opens interactive mode — just type your question
```

## Commands

| Command                      | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `seekly research <question>` | Research a question (flags: `--depth`, `--output`) |
| `seekly doctor`              | Check configuration and model connectivity         |
| `seekly history`             | List past research sessions                        |
| `seekly`                     | Launch interactive mode                            |

### Research Depth

```bash
seekly research "quantum computing basics" --depth quick
seekly research "AI regulation globally" --depth standard
seekly research "CRISPR ethics" --depth deep
```

## Configuration

All settings in `.env`:

```env
# Model
SEEKLY_MODEL_URL=http://127.0.0.1:8080
SEEKLY_MODEL_NAME=local-model

# Search (duckduckgo needs no API key)
SEARCH_PROVIDER=duckduckgo
# SEARCH_API_KEY=your_key_here  # for tavily/serpapi

# Citations
SEEKLY_CITATION_STYLE=apa  # apa | mla | chicago | ieee | harvard | vancouver

# Offline mode (local LLM only, no web search)
# SEEKLY_OFFLINE=true
```

## How It Works

```
Question → Query Generation → Web Search → Source Retrieval → Synthesis → Report
              ↓                    ↓              ↓              ↓
         [local LLM]        [DuckDB/etc]    [fetch pages]   [local LLM]
```

1. **Search** — LLM generates 5 targeted search queries
2. **Retrieve** — Top results fetched and content extracted
3. **Synthesize** — LLM writes a structured report with `[1]` citation markers
4. **Store** — Session saved to SQLite for history

## Requirements

- Node.js >= 20
- llama.cpp running locally (or any OpenAI-compatible endpoint)

## License

MIT
