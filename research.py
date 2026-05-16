#!/usr/bin/env python3
"""
Research CLI - Local AI-powered research assistant
Usage: python research.py "your research question"
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import asyncio

import click
import ollama
from duckduckgo_search import DDGS
from rich.console import Console
from rich.markdown import Markdown
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.table import Table
from rich.syntax import Syntax
import requests
from bs4 import BeautifulSoup
import arxiv

from config import config

# Setup
console = Console()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WebSearcher:
    """Handles web search operations"""
    
    def __init__(self):
        self.ddgs = DDGS()
    
    def search_web(self, query: str, max_results: int = 5) -> List[Dict]:
        """Search the web using DuckDuckGo"""
        try:
            results = []
            search_results = self.ddgs.text(query, max_results=max_results)
            
            for result in search_results:
                results.append({
                    'title': result.get('title', ''),
                    'link': result.get('href', ''),
                    'snippet': result.get('body', ''),
                    'source': 'web'
                })
            return results
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return []
    
    def search_arxiv(self, query: str, max_results: int = 5) -> List[Dict]:
        """Search arxiv for academic papers"""
        try:
            client = arxiv.Client()
            search = arxiv.Search(
                query=query,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.Relevance
            )
            
            results = []
            for paper in client.results(search):
                results.append({
                    'title': paper.title,
                    'link': paper.entry_id,
                    'snippet': paper.summary.replace('\n', ' ')[:300],
                    'authors': [author.name for author in paper.authors],
                    'published': paper.published.strftime('%Y-%m-%d'),
                    'source': 'arxiv'
                })
            return results
        except Exception as e:
            logger.error(f"Arxiv search error: {e}")
            return []

class ContentExtractor:
    """Extracts content from web pages"""
    
    @staticmethod
    def fetch_content(url: str, timeout: int = 10) -> Optional[str]:
        """Fetch and extract text content from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text and clean it
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text[:5000]  # Limit content length
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

class LLMInterface:
    """Interface with local LLM via Ollama"""
    
    def __init__(self, model_name: str = config.MODEL_NAME):
        self.model_name = model_name
        self._ensure_model()
    
    def _ensure_model(self):
        """Check if model is available"""
        try:
            models = ollama.list()
            available_models = [model['name'] for model in models['models']]
            if self.model_name not in available_models:
                console.print(f"[yellow]Model {self.model_name} not found. Pulling...[/yellow]")
                ollama.pull(self.model_name)
        except Exception as e:
            logger.error(f"Error checking models: {e}")
    
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        """Generate response from LLM"""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = ollama.chat(
                model=self.model_name,
                messages=messages,
                options={
                    "temperature": config.TEMPERATURE,
                    "num_predict": config.MAX_TOKENS
                }
            )
            return response['message']['content']
        except Exception as e:
            logger.error(f"LLM error: {e}")
            return f"Error generating response: {e}"

class ResearchAssistant:
    """Main research assistant orchestrator"""
    
    def __init__(self):
        self.searcher = WebSearcher()
        self.extractor = ContentExtractor()
        self.llm = LLMInterface()
        self.results = {
            'web': [],
            'academic': [],
            'analysis': ''
        }
    
    def research(self, query: str) -> Dict:
        """Conduct research on a query"""
        console.print(Panel.fit(f"[bold cyan]Researching: {query}[/bold cyan]"))
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            # Phase 1: Search
            task1 = progress.add_task("[cyan]Searching web...", total=None)
            self.results['web'] = self.searcher.search_web(
                query, 
                config.MAX_SEARCH_RESULTS
            )
            progress.update(task1, completed=True)
            
            # Phase 2: Academic search
            task2 = progress.add_task("[cyan]Searching academic papers...", total=None)
            self.results['academic'] = self.searcher.search_arxiv(
                query, 
                config.MAX_SEARCH_RESULTS
            )
            progress.update(task2, completed=True)
            
            # Phase 3: Extract content
            task3 = progress.add_task("[cyan]Extracting content...", total=len(self.results['web']))
            for result in self.results['web']:
                if result['link']:
                    content = self.extractor.fetch_content(result['link'])
                    result['content'] = content
                progress.advance(task3)
            
            # Phase 4: Analyze and synthesize
            task4 = progress.add_task("[cyan]Analyzing with AI...", total=None)
            analysis = self._analyze_results(query)
            self.results['analysis'] = analysis
            progress.update(task4, completed=True)
        
        return self.results
    
    def _analyze_results(self, query: str) -> str:
        """Use LLM to analyze and synthesize results"""
        
        # Prepare context from search results
        context = self._prepare_context()
        
        system_prompt = """You are an expert research assistant. Analyze the provided search results 
        and create a comprehensive research brief. Include:
        1. Key findings and insights
        2. Important papers and their contributions
        3. Current state of research
        4. Potential gaps or future directions
        5. Recommended resources for deeper reading
        
        Format your response in Markdown with clear sections."""
        
        prompt = f"""Research Query: {query}

Search Results and Context:
{context}

Please provide a comprehensive analysis and research brief based on these results."""
        
        return self.llm.generate_response(prompt, system_prompt)
    
    def _prepare_context(self) -> str:
        """Prepare context from all sources"""
        context_parts = []
        
        # Add web results
        context_parts.append("### Web Resources:")
        for i, result in enumerate(self.results['web'], 1):
            context_parts.append(f"\n{i}. {result['title']}")
            context_parts.append(f"   URL: {result['link']}")
            context_parts.append(f"   Summary: {result['snippet']}")
            if result.get('content'):
                context_parts.append(f"   Content Preview: {result['content'][:500]}...")
        
        # Add academic results
        context_parts.append("\n### Academic Papers:")
        for i, paper in enumerate(self.results['academic'], 1):
            context_parts.append(f"\n{i}. {paper['title']}")
            context_parts.append(f"   Authors: {', '.join(paper.get('authors', []))}")
            context_parts.append(f"   Published: {paper.get('published', 'N/A')}")
            context_parts.append(f"   Summary: {paper['snippet'][:300]}")
        
        return '\n'.join(context_parts)
    
    def display_results(self):
        """Display research results in a formatted way"""
        console.print("\n[bold green]✨ Research Complete![/bold green]\n")
        
        # Display web results
        web_table = Table(title="🌐 Web Resources")
        web_table.add_column("#", style="cyan", width=4)
        web_table.add_column("Title", style="green")
        web_table.add_column("URL", style="blue")
        
        for i, result in enumerate(self.results['web'], 1):
            web_table.add_row(
                str(i),
                result['title'][:100],
                result['link'][:60]
            )
        console.print(web_table)
        
        # Display academic papers
        if self.results['academic']:
            arxiv_table = Table(title="📚 Academic Papers")
            arxiv_table.add_column("#", style="cyan", width=4)
            arxiv_table.add_column("Title", style="green")
            arxiv_table.add_column("Authors", style="yellow")
            arxiv_table.add_column("Date", style="blue")
            
            for i, paper in enumerate(self.results['academic'], 1):
                authors = ', '.join(paper.get('authors', [])[:2])
                if len(paper.get('authors', [])) > 2:
                    authors += ' et al.'
                arxiv_table.add_row(
                    str(i),
                    paper['title'][:80],
                    authors[:40],
                    paper.get('published', 'N/A')
                )
            console.print(arxiv_table)
        
        # Display analysis
        console.print("\n[bold magenta]📊 Research Analysis[/bold magenta]")
        console.print(Panel(
            Markdown(self.results['analysis']),
            border_style="green"
        ))
    
    def save_results(self, query: str):
        """Save results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_query = "".join(c for c in query if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
        filename = f"{config.OUTPUT_DIR}/research_{safe_query}_{timestamp}.md"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Research Brief: {query}\n\n")
            f.write(f"*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
            f.write("---\n\n")
            f.write(self.results['analysis'])
            f.write("\n\n---\n\n")
            f.write("## Sources\n\n")
            
            f.write("### Web Sources\n")
            for i, result in enumerate(self.results['web'], 1):
                f.write(f"{i}. [{result['title']}]({result['link']})\n")
            
            if self.results['academic']:
                f.write("\n### Academic Papers\n")
                for i, paper in enumerate(self.results['academic'], 1):
                    f.write(f"{i}. {paper['title']}\n")
                    f.write(f"   - Authors: {', '.join(paper.get('authors', []))}\n")
                    f.write(f"   - Link: {paper['link']}\n")
        
        console.print(f"\n[green]Results saved to: {filename}[/green]")
        
        # Also save as JSON
        json_filename = filename.replace('.md', '.json')
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        return filename

@click.command()
@click.argument('query', type=str)
@click.option('--model', '-m', default=config.MODEL_NAME, help='Ollama model to use')
@click.option('--max-results', '-n', default=config.MAX_SEARCH_RESULTS, help='Max search results')
@click.option('--save/--no-save', default=True, help='Save results to file')
@click.option('--web-only', is_flag=True, help='Only search web, skip academic sources')
@click.option('--academic-only', is_flag=True, help='Only search academic sources')
def main(query: str, model: str, max_results: int, save: bool, web_only: bool, academic_only: bool):
    """🔬 Research CLI - AI-powered research assistant
    
    QUERY: Your research question or topic to investigate
    """
    
    # Update config
    config.MODEL_NAME = model
    config.MAX_SEARCH_RESULTS = max_results
    
    try:
        # Initialize assistant
        assistant = ResearchAssistant()
        
        # Specialized searches
        if web_only:
            assistant.results['web'] = assistant.searcher.search_web(query, max_results)
            console.print("[yellow]Web-only search mode[/yellow]")
        elif academic_only:
            assistant.results['academic'] = assistant.searcher.search_arxiv(query, max_results)
            console.print("[yellow]Academic-only search mode[/yellow]")
        else:
            # Full research
            assistant.research(query)
        
        # Display results
        assistant.display_results()
        
        # Save if requested
        if save:
            assistant.save_results(query)
            
    except KeyboardInterrupt:
        console.print("\n[yellow]Research cancelled by user[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)

if __name__ == "__main__":
    main()
