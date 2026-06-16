from dotenv import load_dotenv

from .event_sync import sync_events

load_dotenv()


def main():
    result = sync_events()
    print(
        f"Synced {result['upserted']} TAMUCC Engage events "
        f"(fetched {result['fetched']}, deleted {result['deleted']}, "
        f"lookback {result['lookback_days']} days, retention {result['retention_days']} days)."
    )


if __name__ == '__main__':
    main()
