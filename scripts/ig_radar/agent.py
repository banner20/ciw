#!/usr/bin/env python3
"""
Radar helper: connects your computer to the app's Radar section.

It runs on YOUR computer, logged into your separate scraping account, and:
  - checks the app every ~2 minutes for a "Pull latest" click
  - scrapes the requested creators (last 30 posts each, metadata only)
  - sends the results straight into Radar in the app
  - also pulls automatically if the last pull was 7+ days ago

Setup (once)
  pip install instaloader==4.14.1
  instaloader --login YOUR_SCRAPING_ACCOUNT
  In the app: Radar → "Connect your computer" → Generate token

Run (leave it open)
  python agent.py --app https://your-app.vercel.app --token rdr_xxx --user YOUR_SCRAPING_ACCOUNT

Add --once to do a single pull right now and exit.
"""
import argparse
import json
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
    ap.add_argument("--app", required=True, help="your app's URL, e.g. https://your-app.vercel.app")
    ap.add_argument("--token", required=True, help="token from Radar → Connect your computer")
    ap.add_argument("--user", required=True, help="scraping account (logged in via `instaloader --login`)")
    ap.add_argument("--posts", type=int, default=30, help="recent posts per creator")
    ap.add_argument("--interval", type=int, default=120, help="seconds between checks (min 60)")
    ap.add_argument("--auto-days", type=float, default=7, help="auto-pull if last pull is older than this; 0 = off")
    ap.add_argument("--once", action="store_true", help="pull all tracked creators now and exit")
    args = ap.parse_args()

    L = instaloader.Instaloader(download_pictures=False, download_videos=False, download_video_thumbnails=False,
                                download_geotags=False, download_comments=False, save_metadata=False, quiet=True)
    try:
        L.load_session_from_file(args.user)
    except FileNotFoundError:
        sys.exit(f"No saved session for {args.user}. Run:  instaloader --login {args.user}")

    app = App(args.app, args.token)
    print(f"Radar helper connected to {app.base} as @{args.user}. Ctrl+C to stop.")

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
