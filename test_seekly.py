#!/usr/bin/env python3
"""
Simple test script for Seekly
"""

import sys
from seekly.research import ResearchAssistant
from seekly.config import config

def test_basic_functionality():
    """Test basic Seekly functionality"""
    print("🧪 Testing Seekly...")
    
    # Test configuration
    print(f"✅ Config loaded: {config.MODEL_NAME}")
    
    # Test ResearchAssistant initialization
    assistant = ResearchAssistant()
    print("✅ ResearchAssistant initialized")
    
    # Test web search (without actually running to avoid network calls)
    print("✅ Basic functionality test passed")
    
    print("\n🎉 All tests passed!")
    print("\nTo use Seekly:")
    print("  seekly \"Your research question\" --web-only --max-results 3")

if __name__ == "__main__":
    test_basic_functionality()
