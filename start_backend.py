"""
Main application runner.
Initializes the database, seeds default fixtures, and starts the FastAPI server.

Usage:
    python start_backend.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.seed import main as seed_main

if __name__ == "__main__":
    seed_main()
    import uvicorn

    print("\nAPI server listening on http://localhost:8000 (Docs: /docs)\n")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000)
