"""Serverless entry point using the same artifact and contract as local serving."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'ml-service'))
from inference import prediction_app
app = prediction_app()
