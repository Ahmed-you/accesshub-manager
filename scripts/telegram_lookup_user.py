import argparse
import asyncio
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SESSION_DIR = ROOT / "storage" / "app" / "telegram"
SESSION_NAME = str(SESSION_DIR / "accesshub_lookup")


def load_env_file() -> None:
    env_path = ROOT / ".env"

    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        os.environ.setdefault(key, value)


def read_telegram_config() -> tuple[int, str, str]:
    load_env_file()

    api_id = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")
    phone = os.getenv("TELEGRAM_PHONE")

    missing = [key for key, value in {
        "TELEGRAM_API_ID": api_id,
        "TELEGRAM_API_HASH": api_hash,
        "TELEGRAM_PHONE": phone,
    }.items() if not value]

    if missing:
        print("Missing Telegram config in .env:")
        for key in missing:
            print(f"  - {key}")
        print("\nAdd them like this:")
        print("TELEGRAM_API_ID=123456")
        print('TELEGRAM_API_HASH="your_api_hash"')
        print('TELEGRAM_PHONE="+970599000000"')
        raise SystemExit(2)

    return int(api_id), str(api_hash), str(phone)


def matches_query(query: str, values: list[str | None], exact: bool) -> bool:
    normalized_query = query.lower().strip().lstrip("@")

    for value in values:
        if value is None:
            continue

        normalized_value = str(value).lower().strip().lstrip("@")

        if exact and normalized_value == normalized_query:
            return True

        if not exact and normalized_query in normalized_value:
            return True

    return False


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Find a Telegram user/chat ID from chats that already exist in your Telegram account.",
    )
    parser.add_argument("query", nargs="?", help="Customer name, username, phone, or known part of the chat title.")
    parser.add_argument("--all", action="store_true", help="Show all dialogs instead of searching.")
    parser.add_argument("--exact", action="store_true", help="Require an exact match.")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON only.")
    parser.add_argument("--no-interactive", action="store_true", help="Do not ask for a Telegram login code.")
    parser.add_argument("--limit", type=int, default=500, help="Maximum dialogs to scan. Default: 500.")
    args = parser.parse_args()

    if not args.all and not args.query:
        parser.error("Enter a search query, or use --all.")

    try:
        from telethon import TelegramClient
    except ImportError:
        if args.json:
            print(json.dumps({
                "ok": False,
                "error": "Telethon is not installed. Run: py -m pip install telethon",
                "matches": [],
            }))
            raise SystemExit(2)

        print("Telethon is not installed.")
        print("Install it with:")
        print("  py -m pip install telethon")
        raise SystemExit(2)

    api_id, api_hash, phone = read_telegram_config()
    SESSION_DIR.mkdir(parents=True, exist_ok=True)

    client = TelegramClient(SESSION_NAME, api_id, api_hash)

    if not args.json:
        print("Opening Telegram session...")
        print("If this is your first run, Telegram will send you a login code.")

    if args.no_interactive:
        await client.connect()

        if not await client.is_user_authorized():
            message = "Telegram session is not logged in yet. Run this script once from the terminal without --no-interactive."

            if args.json:
                print(json.dumps({"ok": False, "error": message, "matches": []}))
            else:
                print(message)

            await client.disconnect()
            raise SystemExit(3)
    else:
        await client.start(phone=phone)

    found = 0
    query = args.query or ""
    matches = []

    async for dialog in client.iter_dialogs(limit=args.limit):
        entity = dialog.entity
        username = getattr(entity, "username", None)
        phone_number = getattr(entity, "phone", None)
        entity_id = getattr(entity, "id", None)
        first_name = getattr(entity, "first_name", None)
        last_name = getattr(entity, "last_name", None)
        title = getattr(entity, "title", None)
        name = dialog.name or "Unnamed chat"

        values = [
            name,
            username,
            phone_number,
            str(dialog.id),
            str(entity_id) if entity_id else None,
            first_name,
            last_name,
            title,
        ]

        if not args.all and not matches_query(query, values, args.exact):
            continue

        found += 1
        match = {
            "name": name,
            "chat_id": str(dialog.id),
            "entity_id": str(entity_id) if entity_id else None,
            "username": username,
            "phone": phone_number,
        }
        matches.append(match)

        if args.json:
            continue

        print("\n--- Match ---")
        print(f"Name:       {name}")
        print(f"Chat ID:    {dialog.id}")
        print(f"Entity ID:  {entity_id or ''}")
        print(f"Username:   @{username}" if username else "Username:   ")
        print(f"Phone:      {phone_number or '(hidden or not shared)'}")
        print("Use this in AccessHub: Customer -> Telegram user/chat ID")

    if args.json:
        print(json.dumps({"ok": True, "matches": matches}, ensure_ascii=False))
    elif found == 0:
        print("\nNo matching Telegram chat found.")
        print("Make sure this user has already chatted with your Telegram account.")
        print("Try a smaller part of their name, their @username, or run with --all.")
    else:
        print(f"\nFound {found} match(es).")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
