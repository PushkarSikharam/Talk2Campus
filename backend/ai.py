from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import List, Literal, Optional

import google.generativeai as genai
from fastapi import APIRouter, Cookie, Header
from pydantic import BaseModel

from .auth import decode_access_token
from .db import get_class_schedule_collection, get_events_collection

router = APIRouter()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash').strip()

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class ChatMessageIn(BaseModel):
    role: Literal['user', 'assistant']
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessageIn] = []


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    grounded: bool = True


def _get_optional_user_id(authorization: Optional[str], access_token: Optional[str]) -> Optional[str]:
    token = None
    if authorization:
        scheme, _, token_part = authorization.partition(' ')
        if scheme.lower() == 'bearer' and token_part:
            token = token_part
    if not token and access_token:
        token = access_token
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return payload.get('sub')
    except Exception:
        return None


@lru_cache(maxsize=1)
def _load_buildings() -> List[dict]:
    assets_path = Path(__file__).resolve().parents[1] / 'frontend' / 'src' / 'assets' / 'buildingsNew.txt'
    if not assets_path.exists():
        assets_path = Path(__file__).resolve().parents[1] / 'frontend' / 'src' / 'assets' / 'buildings.txt'
    if not assets_path.exists():
        return []

    try:
        data = json.loads(assets_path.read_text(encoding='utf-8'))
    except Exception:
        return []

    features = data.get('features') if isinstance(data, dict) else None
    if not isinstance(features, list):
        return []

    buildings = []
    for feature in features:
        props = feature.get('properties') or {}
        name = props.get('source_name') or props.get('name') or props.get('title')
        if not name:
            continue
        short_name = props.get('shortName') or props.get('short_name') or props.get('short') or props.get('code')
        description = props.get('description') or props.get('type') or ''
        buildings.append(
            {
                'name': str(name).strip(),
                'short_name': str(short_name).strip() if short_name else '',
                'description': str(description).strip(),
            }
        )
    return buildings


def _score_text_match(question: str, text: str) -> int:
    q = question.lower()
    t = text.lower()
    score = 0
    for token in [part for part in q.replace('?', ' ').replace(',', ' ').split() if len(part) >= 3]:
        if token in t:
            score += 1
    return score


def _format_event(event_doc: dict) -> str:
    title = event_doc.get('title') or event_doc.get('name') or 'Untitled event'
    location = event_doc.get('location') or event_doc.get('shortLocation') or 'Location not listed'
    start_raw = event_doc.get('startsOn_dt') or event_doc.get('startsOn')
    start_text = str(start_raw) if start_raw else 'Time not listed'
    orgs = event_doc.get('organizationNames') or []
    if isinstance(orgs, list):
        org_text = ', '.join(str(item) for item in orgs[:3] if item)
    else:
        org_text = str(orgs)
    return f'- {title} | {location} | {start_text}' + (f' | Hosted by {org_text}' if org_text else '')


def _format_schedule_item(item: dict) -> str:
    course = item.get('course') or 'Course'
    name = item.get('name') or 'Class'
    days = ', '.join(item.get('days') or [])
    time_range = ' to '.join(item.get('time') or []) if isinstance(item.get('time'), list) else str(item.get('time') or '')
    dates = item.get('dates') or []
    date_text = ' through '.join(str(x) for x in dates[:2]) if dates else 'dates not listed'
    return f'- {course}: {name} | {days} | {time_range} | {date_text}'


async def _retrieve_events(question: str) -> List[dict]:
    try:
        events_col = get_events_collection()
        now = datetime.now(timezone.utc)
        query = {'$or': [{'endsOn_dt': {'$gte': now}}, {'endsOn': {'$gte': now.isoformat()}}]}
        cursor = events_col.find(query).sort([('startsOn_dt', 1), ('endsOn', 1)])
        docs = await cursor.to_list(length=75)
    except Exception:
        return []

    scored = []
    for doc in docs:
        haystack = ' '.join(
            str(doc.get(field) or '')
            for field in ['title', 'description', 'location', 'shortLocation', 'theme']
        )
        orgs = doc.get('organizationNames') or []
        if isinstance(orgs, list):
            haystack += ' ' + ' '.join(str(org) for org in orgs)
        score = _score_text_match(question, haystack)
        if any(word in question.lower() for word in ['event', 'today', 'happening', 'club', 'organization']):
            score += 1
        if score > 0:
            scored.append((score, doc))
    scored.sort(key=lambda item: (-item[0], item[1].get('startsOn_dt') or item[1].get('startsOn') or ''))
    return [doc for _, doc in scored[:5]]


def _retrieve_buildings(question: str) -> List[dict]:
    buildings = _load_buildings()
    scored = []
    for building in buildings:
        haystack = ' '.join([building.get('name', ''), building.get('short_name', ''), building.get('description', '')])
        score = _score_text_match(question, haystack)
        if score > 0:
            scored.append((score, building))
    scored.sort(key=lambda item: (-item[0], item[1].get('name', '')))
    return [building for _, building in scored[:5]]


async def _retrieve_schedule(question: str, user_id: Optional[str]) -> List[dict]:
    if not user_id:
        return []
    if not any(word in question.lower() for word in ['class', 'schedule', 'course', 'conflict']):
        return []
    try:
        class_schedule = get_class_schedule_collection()
        return await class_schedule.find({'owner_id': user_id}).to_list(length=10)
    except Exception:
        return []


async def _build_context(question: str, user_id: Optional[str]) -> tuple[str, List[str], bool]:
    events = await _retrieve_events(question)
    buildings = _retrieve_buildings(question)
    schedule = await _retrieve_schedule(question, user_id)

    sections = []
    sources = []

    if buildings:
        sections.append(
            'Campus buildings:\n' + '\n'.join(
                f"- {item['name']}"
                + (
                    f" ({item['short_name']})"
                    if item.get('short_name') and f"({item['short_name']})" not in item['name']
                    else ''
                )
                + (f" | {item['description']}" if item.get('description') else '')
                for item in buildings
            )
        )
        sources.append('Campus building dataset')

    if events:
        sections.append('Upcoming events:\n' + '\n'.join(_format_event(item) for item in events))
        sources.append('TAMUCC Engage event mirror')

    if schedule:
        sections.append('User class schedule:\n' + '\n'.join(_format_schedule_item(item) for item in schedule))
        sources.append('User class schedule')

    context = '\n\n'.join(sections).strip()
    return context, sources, bool(sections)


def _fallback_answer(question: str, context: str, grounded: bool) -> str:
    if not grounded:
        return (
            "I could not find enough campus data in the system to answer that safely. "
            "Try asking about events, buildings, or your class schedule."
        )

    lines = context.splitlines()
    preview = '\n'.join(lines[:8]).strip()
    return (
        "Here is what I found in the Talk2Campus data:\n\n"
        f"{preview}\n\n"
        "If you want, ask a more specific follow-up like a building name, event name, or schedule question."
    )


async def _generate_answer(question: str, history: List[ChatMessageIn], context: str, grounded: bool) -> str:
    if not GEMINI_API_KEY:
        return _fallback_answer(question, context, grounded)

    history_text = '\n'.join(f'{item.role}: {item.content}' for item in history[-6:])
    prompt = f"""
You are the Talk2Campus assistant for a university campus app.

Rules:
- Answer only from the provided context.
- If the context is missing the answer, say you do not have enough verified campus information.
- Do not invent building hours, office rules, or event details.
- Keep the answer helpful, concise, and student-friendly.

Conversation history:
{history_text or 'No prior conversation.'}

Current question:
{question}

Retrieved context:
{context or 'No verified context was found.'}
""".strip()

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = await asyncio.wait_for(
            asyncio.to_thread(model.generate_content, prompt),
            timeout=12,
        )
        text = getattr(response, 'text', '') or ''
        return text.strip() or _fallback_answer(question, context, grounded)
    except Exception:
        return _fallback_answer(question, context, grounded)


@router.post('/chat', response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
):
    question = payload.message.strip()
    if not question:
        return ChatResponse(answer='Please ask a question.', sources=[], grounded=False)

    user_id = _get_optional_user_id(authorization, access_token)
    context, sources, grounded = await _build_context(question, user_id)
    answer = await _generate_answer(question, payload.history, context, grounded)
    return ChatResponse(answer=answer, sources=sources, grounded=grounded)
