import os
import re
import requests
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

API_BASE = "https://tamucc.campuslabs.com/engage/api/discovery/event/search"
BATCH_SIZE = 3000  # API limit per request


# ----------------------------------------------
# SHORT LOCATION GENERATOR (Option A: simple codes)
# ----------------------------------------------

def get_short_location(location: str) -> str:
    if not location or not isinstance(location, str):
        return "UNK"

    loc = location.strip().upper()

    # 1) All University Center → UC
    if "UNIVERSITY CENTER" in loc or loc.startswith("UC "):
        return "UC"

    # 2) Known academic buildings
    mapping = {
        "BAY HALL": "BH",
        "BAYHALL": "BH",
        "ISLAND HALL": "IH",
        "CENTER FOR INSTRUCTION": "CI",
        "CI ": "CI",
        "O'CONNOR": "OCNR",
        "OCNR": "OCNR",
        "MARY AND JEFF BELL LIBRARY": "LIB",
        "BELL LIBRARY": "LIB",
        "DUGAN WELLNESS CENTER": "DWC",
        "DUGAN": "DWC",
        "HARTE RESEARCH INSTITUTE": "HRI",
        "HRI": "HRI",
        "ENGINEERING BUILDING": "EN",
        "RFEB": "EN",
        "TIDAL HALL": "TH",
        "SCIENCE & TECHNOLOGY": "ST",
        "CCH": "CCH",
        "GENERAL ACADEMIC BUILDING": "GAB",
        "CENTER FOR THE ARTS": "CA",
        "PERFORMING ARTS CENTER": "PAC",
        "ROTC": "ROTC",
        "FACULTY CENTER": "FC",
        "COASTAL BEND BUSINESS INNOVATION": "CBI",
        "COASTAL BEND INNOVATION": "CBI",
        "MOMENTUM VILLAGE": "MV",
        "MIRAMAR": "MR",
        "DINING HALL": "DH",
        "ALUMNI WELCOME CENTER": "AWC",
        "ISLANDER WELCOME CENTER": "IWC",
    }

    for key, val in mapping.items():
        if key in loc:
            return val

    # 3) Beaches & outdoor areas
    outdoor = {
        "EAST LAWN": "EL",
        "SEA BREEZE": "SBP",
        "CAMPUS BEACH": "CB",
        "BAYFRONT": "BP",
        "JP LUBY": "JPL",
        "BOB HALL": "BHP",
        "MUSTANG ISLAND": "MI",
    }
    for key, val in outdoor.items():
        if key in loc:
            return val

    # 4) Restaurants / off-campus brands
    brands = {
        "STARBUCKS": "SBX",
        "WHATABURGER": "WBF",
        "IHOP": "IHOP",
        "FREEBIRDS": "FB",
        "MOD PIZZA": "MOD",
        "H-E-B": "HEB",
        "HEB": "HEB",
    }
    for key, val in brands.items():
        if key in loc:
            return val

    # 5) Fallback: take first 3–4 letters + strip numbers
    fallback = re.sub(r"[^A-Z]", "", loc)  # keep letters only
    return fallback[:4] if fallback else "UNK"


# ----------------------------------------------
# MAIN SYNC SCRIPT
# ----------------------------------------------

def main():
    mongo_uri = os.getenv("MONGO_URL")

    if not mongo_uri:
        raise Exception("❌ MONGO_URL not found in .env")

    client = MongoClient(mongo_uri)
    db_name = mongo_uri.split("/")[-1].split("?")[0]
    db = client[db_name]
    events_col = db["events"]

    print(f"✅ Connected to MongoDB database: {db_name}")

    # 1️⃣ Get event count
    first_resp = requests.get(f"{API_BASE}?take=1&status=Approved")
    first_resp.raise_for_status()
    total_count = first_resp.json().get("@odata.count")
    print(f"📌 Total events to fetch: {total_count}")

    all_events = []
    skip = 0

    # 2️⃣ Pagination loop
    while skip < total_count:
        print(f"⬇️ Fetching events {skip+1} to {min(skip+BATCH_SIZE, total_count)}...")
        url = (
            f"{API_BASE}?take={BATCH_SIZE}&skip={skip}"
            "&orderByField=endsOn&orderByDirection=ascending&status=Approved"
        )
        resp = requests.get(url)
        resp.raise_for_status()

        batch_events = resp.json().get("value", [])
        all_events.extend(batch_events)

        retrieved = len(batch_events)
        print(f"   ✔ Retrieved {retrieved}")

        if retrieved == 0:
            print("⚠️ No more events returned, stopping.")
            break

        skip += retrieved

    print(f"📌 Total events retrieved: {len(all_events)}")

    # 3️⃣ Upsert with shortLocation
    print("📝 Upserting events into MongoDB...")

    ops = []
    for event in all_events:
        event["_id"] = event["id"]

        # ADD SHORT LOCATION
        loc = event.get("location")
        event["shortLocation"] = get_short_location(loc)

        ops.append(UpdateOne({"_id": event["_id"]}, {"$set": event}, upsert=True))

    if ops:
        events_col.bulk_write(ops)

    print("✅ All events synced successfully!")
    client.close()
    print("🔌 MongoDB connection closed.")


if __name__ == "__main__":
    main()
