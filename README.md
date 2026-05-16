# Seekly - AI-Powered Research Assistant

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Local AI-powered research CLI tool that combines web search, academic paper search, and LLM analysis.

## Features

- Web search via DuckDuckGo
- Academic paper search via arXiv
- AI analysis using local Ollama models
- Markdown and JSON result export
- Rich console output with progress tracking
- Configurable output directory

## Installation

### Prerequisites

- Python 3.8+
- pip 21.0+
- Ollama installed and running
- Required models pulled (e.g., `llama3:1b`)

### Install from Source

```bash
# Clone repository
git clone https://github.com/uxlabspk/seekly.git
cd seekly

# Install dependencies
pip install -r requirements.txt

# Install package
pip install -e .
```

### Install via pip

```bash
pip install seekly
```

## Usage

```bash
# Basic research
seekly "What are the latest advances in quantum computing?"

# Specify model
seekly "AI ethics" --model llama3

# Limit results
seekly "Python web frameworks" --max-results 3

# Web-only search
seekly "latest tech news" --web-only

# Academic-only search
seekly "machine learning papers" --academic-only

# Don't save results
seekly "temporary search" --no-save
```

## Configuration

Create `config.py` or modify existing one:

```python
# Model settings
MODEL_NAME = "llama3"
TEMPERATURE = 0.7
MAX_TOKENS = 4096

# Search settings
MAX_SEARCH_RESULTS = 5

# Output settings
OUTPUT_DIR = "research_output"
```

## Project Structure

```
seekly/
├── seekly/               # Main package directory
│   ├── __init__.py        # Package initialization
│   ├── research.py        # Main CLI application
│   └── config.py          # Configuration settings
├── setup.py              # Package setup script
├── requirements.txt      # Python dependencies
├── test_seekly.py        # Basic functionality test
├── output/              # Default output directory
└── README.md             # This file
```

## Dependencies

```
click              # CLI framework
ollama             # LLM interface
ddgs               # Web search (replaces duckduckgo-search)
arxiv              # Academic paper search
rich               # Console formatting
requests           # HTTP requests
beautifulsoup4     # HTML parsing
pypdf              # PDF processing
markdown           # Markdown processing
```

## Installation Verification

```bash
# Verify installation
seekly --help

# Test basic functionality
python test_seekly.py

# Run a simple query
seekly "What is AI?" --web-only --max-results 2 --no-save
```

## Running Tests

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run tests
pytest

# Run with coverage
pytest --cov=seekly

# Run specific test
pytest test_seekly.py
```

## Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install development dependencies
pip install -r requirements.txt
pip install -e .

# Run directly
python research.py "test query"
```

## Examples

### Basic Research
```bash
seekly "What are the latest advances in AI?"
```

### Academic Research
```bash
seekly "Quantum computing breakthroughs" --academic-only
```

### Web Research
```bash
seekly "Latest Python frameworks 2024" --web-only --max-results 10
```

## Output Format

Results are saved as:
- `research_[query]_[timestamp].md` - Formatted research brief
- `research_[query]_[timestamp].json` - Raw data

## License

MIT License - see [LICENSE](LICENSE) file.

## Support

- Issues: [GitHub Issues](https://github.com/uxlabspk/seekly/issues)
- Discussions: [GitHub Discussions](https://github.com/uxlabspk/seekly/discussions)

## Roadmap

- [ ] Add more academic sources (PubMed, IEEE)
- [ ] Support for multiple LLM providers
- [ ] Interactive research mode
- [ ] Research history and bookmarks
- [ ] Custom prompt templates

---

*Built with ❤️ for researchers and curious minds*