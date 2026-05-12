import argparse
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlparse


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
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


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
        raise RuntimeError("Missing Telegram config in .env: " + ", ".join(missing))

    return int(api_id), str(api_hash), str(phone)


def normalize_target(target: str) -> str | int:
    value = target.strip()

    if value.startswith("https://t.me/"):
        value = value.replace("https://t.me/", "", 1).strip("/")

        if "/" in value and not value.startswith("c/"):
            value = value.split("/", 1)[0]

    if value.startswith("@"):
        value = value[1:]

    if value.lstrip("-").isdigit():
        return int(value)

    return value


def normalize_dialog_name(value: str | None) -> str:
    if not value:
        return ""

    return "".join(character for character in value.lower() if character.isalnum())


async def resolve_chat_smart(client, chat_ref: str | int):
    resolution_error = None

    try:
        return await client.get_entity(chat_ref)
    except Exception as exception:
        resolution_error = exception

    if isinstance(chat_ref, int):
        raise resolution_error

    wanted = normalize_dialog_name(str(chat_ref).lstrip("@"))

    if not wanted:
        raise resolution_error

    async for dialog in client.iter_dialogs(limit=500):
        entity = dialog.entity
        candidates = [
            dialog.name,
            getattr(entity, "username", None),
            getattr(entity, "title", None),
            " ".join(filter(None, [getattr(entity, "first_name", None), getattr(entity, "last_name", None)])),
        ]

        if any(normalize_dialog_name(candidate) == wanted for candidate in candidates):
            return entity

    raise resolution_error


async def get_message_from_chat_ref(client, chat_ref: str | int, message_id: int):
    entity = await resolve_chat_smart(client, chat_ref)

    return await client.get_messages(entity, ids=message_id)


async def get_message_smart(client, link_or_id: str):
    value = str(link_or_id).strip().split("?", 1)[0]

    if not value:
        return None

    try:
        if ":" in value and "/" not in value:
            chat_ref, message_ref = value.rsplit(":", 1)

            if chat_ref.strip().lstrip("-").isdigit() and message_ref.strip().isdigit():
                return await get_message_from_chat_ref(client, int(chat_ref.strip()), int(message_ref.strip()))

        if "t.me/c/" in value:
            parts = value.rstrip("/").split("/")
            message_id = int(parts[-1])
            channel_id = int("-100" + parts[-2])

            return await get_message_from_chat_ref(client, channel_id, message_id)

        if "t.me/" in value:
            parsed = urlparse(value)
            tail = (parsed.path if parsed.netloc else value.replace("https://t.me/", "", 1).replace("http://t.me/", "", 1)).strip("/")
            parts = tail.split("/")

            if len(parts) >= 2 and parts[-1].isdigit():
                return await get_message_from_chat_ref(client, parts[0], int(parts[-1]))

        if "/" in value and not value.startswith(("http://", "https://")):
            chat_ref, message_ref = value.rsplit("/", 1)

            if chat_ref.strip() and message_ref.strip().isdigit():
                return await get_message_from_chat_ref(client, normalize_target(chat_ref), int(message_ref.strip()))

        if value.isdigit():
            return await client.get_messages("me", ids=int(value))
    except Exception:
        return None

    return None


async def main() -> None:
    parser = argparse.ArgumentParser(description="Send one queued AccessHub Telegram message.")
    parser.add_argument("--target", required=True, help="Telegram username, user/chat ID, group ID, or group link.")
    parser.add_argument("--message-body", default="", help="Text body to send.")
    parser.add_argument("--source-message-ref", default="", help="Optional Telegram saved message/link to copy.")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON only.")
    parser.add_argument("--no-interactive", action="store_true", help="Do not ask for a Telegram login code.")
    args = parser.parse_args()

    try:
        from telethon import TelegramClient
    except ImportError:
        print(json.dumps({"ok": False, "error": "Telethon is not installed."}))
        raise SystemExit(2)

    try:
        api_id, api_hash, phone = read_telegram_config()
        SESSION_DIR.mkdir(parents=True, exist_ok=True)

        client = TelegramClient(SESSION_NAME, api_id, api_hash)

        if args.no_interactive:
            await client.connect()

            if not await client.is_user_authorized():
                raise RuntimeError("Telegram session is not logged in yet. Run telegram_lookup_user.py once without --no-interactive.")
        else:
            await client.start(phone=phone)

        target = normalize_target(args.target)

        if args.source_message_ref.strip():
            source_message = await get_message_smart(client, args.source_message_ref)

            if not source_message:
                raise RuntimeError(
                    "Could not find Telegram source message. Check the message link or chat_id:message_id reference. "
                    "Also make sure this logged-in Telegram session can see the source channel/group."
                )

            sent = await client.send_message(target, source_message)
        elif args.message_body.strip():
            sent = await client.send_message(target, args.message_body.strip())
        else:
            raise RuntimeError("Message body or source message reference is required.")

        message_id = getattr(sent, "id", None)

        print(json.dumps({
            "ok": True,
            "target": str(args.target),
            "sent_message_id": message_id,
            "source_message_ref": args.source_message_ref.strip() or None,
        }, ensure_ascii=False))

        await client.disconnect()
    except Exception as exception:
        print(json.dumps({"ok": False, "error": str(exception)}, ensure_ascii=False))
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
