"""Uploads a rendered episode to YouTube, Facebook, Instagram and Telegram.

Each channel is enabled only when its secrets are present in the environment.
"""
import os
import time

import requests

TIMEOUT = 300


def env(name, default=""):
    return os.environ.get(name, "").strip() or default


def graph_version():
    return env("GRAPH_API_VERSION", "v26.0")


def check(resp):
    if resp.status_code >= 400:
        raise RuntimeError(f"{resp.request.method} {resp.url.split('?')[0]} -> {resp.status_code}: {resp.text[:500]}")
    return resp


# ---------- YouTube ----------

def youtube_enabled():
    return all(env(k) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))


def youtube(ep, video):
    token = check(requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": env("YT_CLIENT_ID"),
        "client_secret": env("YT_CLIENT_SECRET"),
        "refresh_token": env("YT_REFRESH_TOKEN"),
        "grant_type": "refresh_token",
    }, timeout=60)).json()["access_token"]
    meta = {
        "snippet": {
            "title": ep["youtube_title"],
            "description": ep["description"],
            "tags": ep["tags"],
            "categoryId": "27",  # Education
            "defaultLanguage": "ar",
            "defaultAudioLanguage": "ar",
        },
        "status": {
            "privacyStatus": env("YOUTUBE_PRIVACY", "public"),
            "selfDeclaredMadeForKids": env("YOUTUBE_MADE_FOR_KIDS", "true").lower() == "true",
        },
    }
    size = video.stat().st_size
    session = check(requests.post(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        headers={"Authorization": f"Bearer {token}", "X-Upload-Content-Type": "video/mp4",
                 "X-Upload-Content-Length": str(size)},
        json=meta, timeout=60))
    with video.open("rb") as fh:
        result = check(requests.put(session.headers["Location"], data=fh,
                                    headers={"Authorization": f"Bearer {token}", "Content-Type": "video/mp4",
                                             "Content-Length": str(size)},
                                    timeout=TIMEOUT)).json()
    return {"id": result["id"], "url": f"https://youtu.be/{result['id']}",
            "privacy": result.get("status", {}).get("privacyStatus")}


# ---------- Facebook Page ----------

def facebook_enabled():
    return bool(env("FB_PAGE_ID") and env("FB_PAGE_TOKEN"))


def facebook(ep, video):
    with video.open("rb") as fh:
        result = check(requests.post(
            f"https://graph-video.facebook.com/{graph_version()}/{env('FB_PAGE_ID')}/videos",
            data={"access_token": env("FB_PAGE_TOKEN"), "title": ep["youtube_title"], "description": ep["caption"]},
            files={"source": (video.name, fh, "video/mp4")}, timeout=TIMEOUT)).json()
    return {"id": result["id"], "url": f"https://www.facebook.com/{result['id']}"}


# ---------- Instagram (Reels, via the Facebook Page token) ----------

def instagram_enabled():
    return bool(env("IG_USER_ID") and env("FB_PAGE_TOKEN"))


def instagram(ep, video):
    base = f"https://graph.facebook.com/{graph_version()}"
    token = env("FB_PAGE_TOKEN")
    container = check(requests.post(f"{base}/{env('IG_USER_ID')}/media", data={
        "media_type": "REELS", "upload_type": "resumable", "caption": ep["caption"][:2200],
        "share_to_feed": "true", "access_token": token,
    }, timeout=60)).json()
    upload_uri = container.get("uri") or f"https://rupload.facebook.com/ig-api-upload/{graph_version()}/{container['id']}"
    check(requests.post(upload_uri, data=video.read_bytes(), headers={
        "Authorization": f"OAuth {token}", "offset": "0", "file_size": str(video.stat().st_size),
    }, timeout=TIMEOUT))
    for _ in range(60):
        status = check(requests.get(f"{base}/{container['id']}",
                                    params={"fields": "status_code,status", "access_token": token},
                                    timeout=60)).json()
        if status.get("status_code") == "FINISHED":
            break
        if status.get("status_code") == "ERROR":
            raise RuntimeError(f"Instagram processing failed: {status}")
        time.sleep(10)
    else:
        raise RuntimeError("Instagram processing timed out")
    result = check(requests.post(f"{base}/{env('IG_USER_ID')}/media_publish",
                                 data={"creation_id": container["id"], "access_token": token}, timeout=60)).json()
    return {"id": result["id"]}


# ---------- Telegram channel ----------

def telegram_enabled():
    return bool(env("TG_BOT_TOKEN") and env("TG_CHAT_ID"))


def telegram(ep, video):
    with video.open("rb") as fh:
        result = check(requests.post(
            f"https://api.telegram.org/bot{env('TG_BOT_TOKEN')}/sendVideo",
            data={"chat_id": env("TG_CHAT_ID"), "caption": ep["caption"][:1024], "supports_streaming": "true",
                  "width": "1080", "height": "1920"},
            files={"video": (video.name, fh, "video/mp4")}, timeout=TIMEOUT)).json()
    return {"id": result["result"]["message_id"]}


CHANNELS = {
    "youtube": (youtube_enabled, youtube),
    "facebook": (facebook_enabled, facebook),
    "instagram": (instagram_enabled, instagram),
    "telegram": (telegram_enabled, telegram),
}
