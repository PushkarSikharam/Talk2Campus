import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from pymongo import ASCENDING, MongoClient, UpdateOne

logger = logging.getLogger(__name__)

ENGAGE_API_BASE = os.getenv(
    'ENGAGE_API_BASE',
    'https://tamucc.campuslabs.com/engage/api/discovery/event/search',
)
ENGAGE_BATCH_SIZE = int(os.getenv('ENGAGE_BATCH_SIZE', '100'))
ENGAGE_LOOKBACK_DAYS = int(os.getenv('ENGAGE_LOOKBACK_DAYS', '30'))
ENGAGE_RETENTION_DAYS = int(os.getenv('ENGAGE_RETENTION_DAYS', '60'))


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    candidates = [text]
    if text.endswith('Z'):
        candidates.append(text[:-1] + '+00:00')
    for candidate in candidates:
        try:
            parsed = datetime.fromisoformat(candidate)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _extract_organization_names(event: dict[str, Any]) -> list[str]:
    names = []
    for key in ['organizationNames', 'organizationName', 'hostNames', 'benefitNames', 'organizerNames']:
        value = event.get(key)
        if isinstance(value, list):
            names.extend(str(item).strip() for item in value if item)
        elif value:
            names.append(str(value).strip())

    for key in ['organizations', 'hosts', 'benefits', 'organizers']:
        value = event.get(key)
        if not isinstance(value, list):
            continue
        for item in value:
            if isinstance(item, str) and item.strip():
                names.append(item.strip())
            elif isinstance(item, dict):
                name = item.get('name') or item.get('organizationName') or item.get('displayName') or item.get('title')
                if name:
                    names.append(str(name).strip())

    deduped = []
    seen = set()
    for name in names:
        lowered = name.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(name)
    return deduped


def get_short_location(location: str | None) -> str:
    if not location or not isinstance(location, str):
        return 'UNK'
    loc = location.strip().upper()
    if 'UNIVERSITY CENTER' in loc or loc.startswith('UC '):
        return 'UC'

    mapping = {
        'BAY HALL': 'BH',
        'BAYHALL': 'BH',
        'ISLAND HALL': 'IH',
        'CENTER FOR INSTRUCTION': 'CI',
        'CI ': 'CI',
        "O'CONNOR": 'OCNR',
        'OCNR': 'OCNR',
        'MARY AND JEFF BELL LIBRARY': 'LIB',
        'BELL LIBRARY': 'LIB',
        'DUGAN WELLNESS CENTER': 'DWC',
        'DUGAN': 'DWC',
        'HARTE RESEARCH INSTITUTE': 'HRI',
        'HRI': 'HRI',
        'ENGINEERING BUILDING': 'EN',
        'RFEB': 'EN',
        'TIDAL HALL': 'TH',
        'SCIENCE & TECHNOLOGY': 'ST',
        'CCH': 'CCH',
        'GENERAL ACADEMIC BUILDING': 'GAB',
        'CENTER FOR THE ARTS': 'CA',
        'PERFORMING ARTS CENTER': 'PAC',
        'ROTC': 'ROTC',
        'FACULTY CENTER': 'FC',
        'COASTAL BEND BUSINESS INNOVATION': 'CBI',
        'COASTAL BEND INNOVATION': 'CBI',
        'MOMENTUM VILLAGE': 'MV',
        'MIRAMAR': 'MR',
        'DINING HALL': 'DH',
        'ALUMNI WELCOME CENTER': 'AWC',
        'ISLANDER WELCOME CENTER': 'IWC',
    }
    for key, val in mapping.items():
        if key in loc:
            return val

    outdoor = {
        'EAST LAWN': 'EL',
        'SEA BREEZE': 'SBP',
        'CAMPUS BEACH': 'CB',
        'BAYFRONT': 'BP',
        'JP LUBY': 'JPL',
        'BOB HALL': 'BHP',
        'MUSTANG ISLAND': 'MI',
    }
    for key, val in outdoor.items():
        if key in loc:
            return val

    brands = {
        'STARBUCKS': 'SBX',
        'WHATABURGER': 'WBF',
        'IHOP': 'IHOP',
        'FREEBIRDS': 'FB',
        'MOD PIZZA': 'MOD',
        'H-E-B': 'HEB',
        'HEB': 'HEB',
    }
    for key, val in brands.items():
        if key in loc:
            return val

    fallback = re.sub(r'[^A-Z]', '', loc)
    return fallback[:4] if fallback else 'UNK'


def normalize_event(raw_event: dict[str, Any]) -> dict[str, Any]:
    source_id = _normalize_text(raw_event.get('id') or raw_event.get('eventId'))
    if not source_id:
        raise ValueError('Event is missing an id')

    title = _normalize_text(raw_event.get('title') or raw_event.get('name') or raw_event.get('eventName')) or 'Untitled Event'
    location = _normalize_text(raw_event.get('location') or raw_event.get('locationName') or raw_event.get('place') or raw_event.get('venue'))
    starts_on = raw_event.get('startsOn') or raw_event.get('startDateTime') or raw_event.get('startDate')
    ends_on = raw_event.get('endsOn') or raw_event.get('endDateTime') or raw_event.get('endDate')
    organization_names = _extract_organization_names(raw_event)
    theme = _normalize_text(raw_event.get('theme'))
    category_names = raw_event.get('categoryNames') if isinstance(raw_event.get('categoryNames'), list) else []
    benefit_names = raw_event.get('benefitNames') if isinstance(raw_event.get('benefitNames'), list) else []
    image_path = _normalize_text(raw_event.get('imagePath'))

    normalized = dict(raw_event)
    normalized.update(
        {
            '_id': source_id,
            'id': source_id,
            'source_id': source_id,
            'source': 'tamucc-engage',
            'title': title,
            'description': _normalize_text(raw_event.get('description') or raw_event.get('summary') or raw_event.get('body')),
            'location': location,
            'shortLocation': get_short_location(location),
            'startsOn': starts_on,
            'endsOn': ends_on,
            'startsOn_dt': _parse_datetime(starts_on),
            'endsOn_dt': _parse_datetime(ends_on),
            'organizationNames': organization_names,
            'organizationName': _normalize_text(raw_event.get('organizationName')),
            'theme': theme,
            'categoryNames': category_names,
            'benefitNames': benefit_names,
            'rsvpTotal': raw_event.get('rsvpTotal'),
            'imageUrl': image_path,
            'externalUrl': f'https://tamucc.campuslabs.com/engage/event/{source_id}',
            'lastSyncedAt': datetime.now(timezone.utc),
        }
    )
    return normalized


def fetch_engage_events() -> list[dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=ENGAGE_LOOKBACK_DAYS)
    logger.info('Fetching Engage events with %s-day lookback.', ENGAGE_LOOKBACK_DAYS)

    all_events = []
    skip = 0
    while True:
        url = (
            f'{ENGAGE_API_BASE}?take={ENGAGE_BATCH_SIZE}&skip={skip}'
            '&orderByField=startsOn&orderByDirection=descending&status=Approved'
        )
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        batch_events = resp.json().get('value', [])
        if not batch_events:
            break
        reached_old_events = False
        for raw_event in batch_events:
            ends_on = _parse_datetime(raw_event.get('endsOn') or raw_event.get('endDateTime') or raw_event.get('endDate'))
            starts_on = _parse_datetime(raw_event.get('startsOn') or raw_event.get('startDateTime') or raw_event.get('startDate'))
            event_moment = ends_on or starts_on
            if event_moment and event_moment < cutoff:
                reached_old_events = True
                continue
            all_events.append(raw_event)
        skip += len(batch_events)
        if reached_old_events:
            break
    return all_events


def ensure_event_indexes(events_col) -> None:
    events_col.create_index([('source_id', ASCENDING)], unique=True, partialFilterExpression={'source_id': {'$type': 'string'}})
    events_col.create_index([('startsOn_dt', ASCENDING)])
    events_col.create_index([('endsOn_dt', ASCENDING)])
    events_col.create_index([('lastSyncedAt', ASCENDING)])


def cleanup_stale_events(events_col) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=ENGAGE_RETENTION_DAYS)
    result = events_col.delete_many(
        {
            '$or': [
                {'endsOn_dt': {'$lt': cutoff}},
                {
                    '$and': [
                        {'endsOn_dt': {'$exists': False}},
                        {'endsOn': {'$lt': cutoff.isoformat()}},
                    ]
                },
            ]
        }
    )
    return result.deleted_count if result else 0


def sync_events(mongo_url: str | None = None) -> dict[str, int]:
    mongo_uri = mongo_url or os.getenv('MONGO_URL')
    if not mongo_uri:
        raise RuntimeError('MONGO_URL not found in environment')

    client = MongoClient(mongo_uri)
    db = client.get_default_database()
    events_col = db['events']
    ensure_event_indexes(events_col)

    raw_events = fetch_engage_events()
    operations = []
    for raw_event in raw_events:
        normalized = normalize_event(raw_event)
        operations.append(UpdateOne({'_id': normalized['_id']}, {'$set': normalized}, upsert=True))

    if operations:
        events_col.bulk_write(operations)

    deleted = cleanup_stale_events(events_col)
    client.close()
    return {
        'fetched': len(raw_events),
        'upserted': len(operations),
        'deleted': deleted,
        'lookback_days': ENGAGE_LOOKBACK_DAYS,
        'retention_days': ENGAGE_RETENTION_DAYS,
    }
