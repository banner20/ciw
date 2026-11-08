#!/usr/bin/env python3
"""
Radar helper: connects your computer to the app's Radar section.

It runs on YOUR computer, logged into your separate scraping account, and:
  - checks the app every ~2 minutes for a "Pull latest" click
  - scrapes the requested creators (last 30 posts each, metadata only)
  - sends the results straight into Radar in the app
  - also pulls automatically if the last pull was 7+ days ago

Easiest: double-click start-radar.bat (Windows) or start-radar.command (Mac).
It logs in by reusing the scraping account's Firefox login, so you never type
the Instagram password here, and asks for the app URL + token on first run.

Manual:
  pip install instaloader==4.14.1 browser_cookie3
  python agent.py --browser firefox                     # first run asks for app URL + token
  python agent.py --app URL --token rdr_xxx --user ACCOUNT   # or use a saved instaloader session

Add --once to do a single pull right now and exit.
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

try:
    import instaloader
except ImportError:
    sys.exit("Instaloader is not installed. Run:  pip install instaloader==4.14.1")

from pull import pull_creator  # same scraping logic as the CSV script

CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".radar-config.json")


def load_config():
    try:
        with open(CONFIG) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_config(cfg):
    with open(CONFIG, "w") as f:
        json.dump(cfg, f, indent=2)
    try:
        os.chmod(CONFIG, 0o600)
    except OSError:
        pass


def login_from_browser(L, browser):
    """Reuse the scraping account's existing browser login (no password typed here)."""
    try:
        import browser_cookie3
    except ImportError:
        sys.exit("Missing browser_cookie3. Run:  pip install browser_cookie3")
    fn = getattr(browser_cookie3, browser.lower(), None)
    if not fn:
        sys.exit(f"Unsupported browser '{browser}'. Use firefox (recommended), chrome, edge, brave or safari.")
    try:
        cookies = {c.name: c.value for c in fn() if "instagram" in c.domain}
    except Exception as e:
        sys.exit(f"Couldn't read {browser} cookies ({e}). Close {browser} completely and try again.")
    if "sessionid" not in cookies:
        sys.exit(f"Not logged into Instagram in {browser}. Open instagram.com in {browser}, log in with the "
                 f"SCRAPING account, then run this again.")
    L.context.update_cookies(cookies)
    username = L.test_login()
    if not username:
        sys.exit(f"The {browser} Instagram login looks expired. Log in again at instagram.com in {browser}.")
    L.context.username = username
    L.save_session_to_file()
    return username


class App:
    def __init__(self, base, token):
        self.base = base.rstrip("/")
        self.token = token

    def call(self, method, path, body=None):
        req = urllib.request.Request(
            self.base + path, method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json",
                     "User-Agent": "ciw-radar-helper/1.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:300]
            if e.code == 401:
                sys.exit("The app rejected the token. Generate a new one in Radar → Connect your computer.")
            raise RuntimeError(f"App returned {e.code}: {msg}")


def to_app_post(r):
    return {
        "shortcode": r["shortcode"],
        "caption": r.get("full_caption") or r.get("caption") or "",
        "postedAt": r["posted_utc"],
        "durationSec": r.get("duration_s"),
        "isVideo": True,
        "views": r.get("views"),
        "likes": r.get("likes"),
        "comments": r.get("comments"),
        "thumbnailUrl": r.get("thumbnail_url"),
        "mediaUrl": r.get("media_url"),
    }


def run_pull(L, app, handles, limit):
    app.call("POST", "/api/radar/agent/ingest", {"started": True})
    ok, failed, reels = 0, [], 0
    for i, h in enumerate(handles, 1):
        print(f"  [{i}/{len(handles)}] @{h} ...", end=" ", flush=True)
        try:
            followers, rows = pull_creator(L, h, limit)
            app.call("POST", "/api/radar/agent/ingest",
                     {"handle": h, "followers": followers, "posts": [to_app_post(r) for r in rows]})
            ok += 1; reels += len(rows)
            print(f"{len(rows)} reels sent")
        except (instaloader.exceptions.LoginRequiredException,
                instaloader.exceptions.BadCredentialsException) as e:
            status = f"stopped: Instagram login needed again ({e}). Run instaloader --login"
            print(status)
            app.call("POST", "/api/radar/agent/ingest", {"done": True, "status": status})
            return
        except Exception as e:
            failed.append(h)
            print(f"FAILED ({type(e).__name__}: {str(e)[:120]})")
            if "429" in str(e) or "Please wait" in str(e) or "checkpoint" in str(e).lower():
                status = f"stopped early: Instagram asked to slow down after @{h}. Try again later."
                app.call("POST", "/api/radar/agent/ingest", {"done": True, "status": status})
                print(status)
                return
        if i < len(handles):
            time.sleep(random.uniform(20, 40))  # human-ish pace between profiles
    status = f"{ok}/{len(handles)} creators, {reels} reels" + (f" · failed: {', '.join('@' + h for h in failed)}" if failed else "")
    app.call("POST", "/api/radar/agent/ingest", {"done": True, "status": status})
    print(f"  done: {status}")


def main():
    ap = argparse.ArgumentParser(description="Radar helper: scrape on this computer, results go to the app")
    ap.add_argument("--app", help="your app's URL, e.g. https://your-app.vercel.app (saved after first run)")
    ap.add_argument("--token", help="token from Radar → Connect your computer (saved after first run)")
    ap.add_argument("--user", help="scraping account with a saved instaloader session")
    ap.add_argument("--browser", help="reuse the scraping account's login from this browser, e.g. firefox")
    ap.add_argument("--posts", type=int, default=30, help="recent posts per creator")
    ap.add_argument("--interval", type=int, default=120, help="seconds between checks (min 60)")
    ap.add_argument("--auto-days", type=float, default=7, help="auto-pull if last pull is older than this; 0 = off")
    ap.add_argument("--once", action="store_true", help="pull all tracked creators now and exit")
    args = ap.parse_args()

    cfg = load_config()
    app_url = args.app or cfg.get("app")
    token = args.token or cfg.get("token")
    if not app_url:
        app_url = input("Your app's address (e.g. https://your-app.vercel.app): ").strip()
    if not token:
        token = input("Token from the app (Radar → Connect your computer → Generate token): ").strip()
    if not app_url.startswith("http") or not token.startswith("rdr_"):
        sys.exit("That address or token doesn't look right. Run again and paste them from the app.")
    cfg.update({"app": app_url.rstrip("/"), "token": token})

    L = instaloader.Instaloader(download_pictures=False, download_videos=False, download_video_thumbnails=False,
                                download_geotags=False, download_comments=False, save_metadata=False, quiet=True)
    browser = args.browser or cfg.get("browser")
    user = args.user or cfg.get("user")
    if browser and not args.user:
        user = login_from_browser(L, browser)
        cfg["browser"] = browser
    elif user:
        try:
            L.load_session_from_file(user)
        except FileNotFoundError:
            sys.exit(f"No saved session for {user}. Use --browser firefox, or run:  instaloader --login {user}")
    else:
        sys.exit("Tell me how to log in: --browser firefox (recommended) or --user ACCOUNT.")
    cfg["user"] = user
    save_config(cfg)

    app = App(cfg["app"], cfg["token"])
    print(f"Radar helper connected to {app.base} as @{user}. Leave this window open. Ctrl+C to stop.")

    while True:
        try:
            job = app.call("GET", "/api/radar/agent/jobs")
            handles = job.get("handles") or []
            last = job.get("lastRunAt")
            stale = args.auto_days > 0 and (
                not last or (datetime.now(timezone.utc) - datetime.fromisoformat(last.replace("Z", "+00:00"))).days >= args.auto_days)
            if args.once or job.get("pullRequested") or (stale and handles):
                if not handles:
                    print("No creators tracked in the app yet. Add some in Radar.")
                    app.call("POST", "/api/radar/agent/ingest", {"done": True, "status": "no creators tracked"})
                else:
                    reason = "requested from app" if job.get("pullRequested") else ("--once" if args.once else "weekly auto-pull")
                    print(f"{datetime.now():%H:%M} Pulling {len(handles)} creators ({reason})")
                    run_pull(L, app, handles, args.posts)
            if args.once:
                return
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"{datetime.now():%H:%M} check failed: {e}")
        time.sleep(max(60, args.interval))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
