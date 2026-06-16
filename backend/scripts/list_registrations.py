#!/usr/bin/env python
"""
Simple script to list documents from the `registrations` collection.
Usage:
  python scripts/list_registrations.py            # list first 50 registrations
  python scripts/list_registrations.py --user 609...  # list registrations for a given user id

This script reads MONGO_URL from backend/.env. Install dependencies first:
  pip install pymongo python-dotenv

Run from repo root (backend folder):
  python backend/scripts/list_registrations.py
"""
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import os
import argparse

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / '.env')
MONGO_URL = os.environ.get('MONGO_URL')
if not MONGO_URL:
    print('MONGO_URL not set in backend/.env')
    raise SystemExit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--user', help='User id to filter registrations')
parser.add_argument('--limit', type=int, default=50)
args = parser.parse_args()

client = MongoClient(MONGO_URL)
db = client.get_default_database()
regs = db.get_collection('registrations')

query = {}
if args.user:
    # match both string and ObjectId forms
    from bson.objectid import ObjectId
    q = {'$or': [{'user_id': args.user}]}
    try:
        if ObjectId.is_valid(args.user):
            q['$or'].append({'user_id': ObjectId(args.user)})
    except Exception:
        pass
    query = q

print('Query:', query)

for r in regs.find(query).sort('created_at', -1).limit(args.limit):
    # Convert any ObjectId fields for readable printing
    doc = dict(r)
    _id = doc.get('_id')
    if _id is not None:
        doc['_id'] = str(_id)
    # if event_snapshot present, simplify
    if doc.get('event_snapshot'):
        snap = doc['event_snapshot']
        doc['event_snapshot'] = {
            'id': snap.get('id'),
            'title': snap.get('title'),
            'startsOn': snap.get('startsOn'),
        }
    print(doc)

print('\nTotal matched:', regs.count_documents(query))
