import os
from dataclasses import dataclass

@dataclass
class Config:
    # Model configuration
    MODEL_NAME: str = "llama3.2:1b"
    
    # Search configuration
    MAX_SEARCH_RESULTS: int = 50
    SEARCH_TIMEOUT: int = 10
    
    # Output configuration
    OUTPUT_DIR: str = "output"
    
    # Model parameters
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 2048
    
    def __post_init__(self):
        os.makedirs(self.OUTPUT_DIR, exist_ok=True)

config = Config()
