import os
import requests
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

API_BASE = "https://tamucc.campuslabs.com/engage/api/discovery/event/search"
BATCH_SIZE = 3000  # API limit per request


def main():
    mongo_uri = os.getenv("MONGO_URL")

    if not mongo_uri:
        raise Exception("? MONGO_URL not found in .env")

    client = MongoClient(mongo_uri)
    db_name = mongo_uri.split("/")[-1].split("?")[0]
    db = client[db_name]
    events_col = db["events"]

    print(f"?? Connected to MongoDB database: {db_name}")

    # 1?? First call: get total events count
    first_resp = requests.get(f"{API_BASE}?take=1&status=Approved")
    first_resp.raise_for_status()
    total_count = first_resp.json().get("@odata.count")
    print(f"?? Total events to fetch: {total_count}")

    all_events = []
    skip = 0

    # 2?? Paginate until all events retrieved
    while skip < total_count:
        print(f"?? Fetching events {skip+1} to {min(skip+BATCH_SIZE, total_count)}...")
        url = (
            f"{API_BASE}?take={BATCH_SIZE}&skip={skip}"
            "&orderByField=endsOn&orderByDirection=ascending&status=Approved"
        )
        resp = requests.get(url)
        resp.raise_for_status()

        batch_events = resp.json().get("value", [])
        all_events.extend(batch_events)

        retrieved = len(batch_events)
        print(f"?? Retrieved {retrieved} events in this batch")

        if retrieved == 0:
            print("?? No more events returned, stopping early.")
            break

        skip += retrieved

    actual_count = len(all_events)
    print(f"? Total events retrieved: {actual_count}")

    if actual_count != total_count:
        print(f"?? Warning: Expected {total_count} events, but retrieved {actual_count}")

    # 3?? Upsert all events into MongoDB
    print("?? Upserting events into MongoDB...")
    ops = []
    for event in all_events:
        event["_id"] = event["id"]
        ops.append(UpdateOne({"_id": event["_id"]}, {"$set": event}, upsert=True))

    if ops:
        events_col.bulk_write(ops)

    print("?? All events synced successfully!")
    client.close()
    print("?? MongoDB connection closed.")


if __name__ == "__main__":
    main()
