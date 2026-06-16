from dotenv import load_dotenv

from .event_sync import sync_events

load_dotenv()


def main():
    sync_events()
    print('Event refresh complete.')


if __name__ == '__main__':
    main()
