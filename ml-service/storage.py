"""Shared environment, paths, and Prisma-compatible SQLite timestamps."""
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env.local')
load_dotenv(ROOT / '.env')

def database_path() -> Path:
    explicit = os.getenv('SYMPTOSENSE_DB')
    if explicit:
        return Path(explicit).expanduser().resolve()
    url = os.getenv('DATABASE_URL', 'file:./dev.db')
    if not url.startswith('file:'):
        raise ValueError('This service requires the configured SQLite database')
    path = Path(url[5:].split('?', 1)[0])
    return (path if path.is_absolute() else ROOT / 'prisma' / path).resolve()

def connect_db(path=None):
    target = Path(path or database_path())
    if not target.is_file():
        raise FileNotFoundError('Database is not initialized; run database migrations first')
    connection = sqlite3.connect(str(target), timeout=20)
    connection.execute('PRAGMA foreign_keys=ON')
    return connection

def epoch_ms(value=None):
    return int((value or datetime.now(timezone.utc)).timestamp() * 1000)
