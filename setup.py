#!/usr/bin/env python3
"""
Setup script for Seekly - AI-Powered Research Assistant
"""

from setuptools import setup, find_packages
import os

# Read requirements
with open('requirements.txt') as f:
    requirements = f.read().splitlines()

# Read README for long description
with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='seekly',
    version='0.1.0',
    author='UX Labs',
    author_email='info@uxlabspk.com',
    description='AI-Powered Research Assistant CLI',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/uxlabspk/seekly',
    packages=find_packages(),
    install_requires=requirements,
    entry_points={
        'console_scripts': [
            'seekly=seekly.research:main',
        ],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
        'Topic :: Utilities',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.8',
    keywords='research, ai, cli, ollama, search',
    project_urls={
        'Bug Reports': 'https://github.com/uxlabspk/seekly/issues',
        'Source': 'https://github.com/uxlabspk/seekly',
    },
    include_package_data=True,
    package_data={
        '': ['*.md', '*.json'],
    },
)