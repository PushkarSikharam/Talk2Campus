import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env file located next to this db.py (backend/.env)
env_file = Path(__file__).resolve().parent / '.env'
if env_file.exists():
    load_dotenv(env_file)

MONGO_URL = os.environ.get('MONGO_URL')
if not MONGO_URL:
    raise RuntimeError('MONGO_URL not set in environment')

client = AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()

def get_users_collection():
    return db['users']


def get_class_schedule_collection():
    return db['classSchedule']
