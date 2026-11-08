#!/usr/bin/env python3
"""
IG Radar: weekly competitor pull. Run this on YOUR computer, logged in with the scraping account.

What it does
  1. Reads the last N posts of each creator in creators.txt (metadata only, no downloads)
  2. Works out each creator's usual (median) views
  3. Flags reels that did 3x+ their usual ("outliers")
  4. Writes reels.csv (everything) and outliers.csv, and optionally downloads only the outlier videos

Setup (once)
  pip install instaloader==4.14.1
  instaloader --login YOUR_SCRAPING_ACCOUNT      # asks for the password, saves a session file locally

Run (weekly)
  python pull.py --user YOUR_SCRAPING_ACCOUNT
  python pull.py --user YOUR_SCRAPING_ACCOUNT --download   # also save outlier videos to ./videos

Keep it gentle: one run a week, ~20 creators. Use a separate account, never Nitin's.
"""
import argparse
import csv
import random
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import instaloader
except ImportError:
    sys.exit("Instaloader is not installed. Run:  pip install instaloader==4.14.1")

HERE = Path(__file__).parent


def views_of(post):
    """Instagram's public 'views' are plays. Prefer play count, fall back to the older view count."""
    for key in ("video_play_count", "play_count", "ig_play_count"):
        try:
            v = post._node.get(key)
            if v:
                return int(v)
        except Exception:
            pass
    try:
        return post.video_view_count
    except Exception:
        return None


def pull_creator(L, handle, limit):
    profile = instaloader.Profile.from_username(L.context, handle)
    rows = []
    seen = 0
    for post in profile.get_posts():
        seen += 1
        if seen > limit + 3:   # +3 to allow for pinned posts
            break
        if not post.is_video:
            continue
        if post.owner_username.lower() != handle.lower():
            continue           # collab posted by someone else (e.g. a brand)
        rows.append({
            "handle": handle,
            "shortcode": post.shortcode,
            "url": f"https://www.instagram.com/reel/{post.shortcode}/",
            "posted_utc": post.date_utc.replace(tzinfo=timezone.utc).isoformat(timespec="minutes"),
            "views": views_of(post),
            "likes": post.likes,
            "comments": post.comments,
            "duration_s": round(post.video_duration or 0),
            "pinned": getattr(post, "is_pinned", False),
            "caption": (post.caption or "").replace("\n", " ")[:300],
        })
        if len(rows) >= limit:
            break
    return profile.followers, rows


def main():
    ap = argparse.ArgumentParser(description="Weekly Instagram competitor pull")
    ap.add_argument("--user", required=True, help="scraping account username (session saved via `instaloader --login`)")
    ap.add_argument("--creators", default=str(HERE / "creators.txt"))
    ap.add_argument("--posts", type=int, default=30, help="recent posts per creator (default 30)")
    ap.add_argument("--threshold", type=float, default=3.0, help="outlier = views >= threshold x creator median")
    ap.add_argument("--min-age-days", type=float, default=3, help="ignore reels younger than this when flagging")
    ap.add_argument("--download", action="store_true", help="download outlier videos into ./videos")
    ap.add_argument("--out", default=str(HERE / "output"))
    args = ap.parse_args()

    handles = [l.strip().lstrip("@").lower() for l in Path(args.creators).read_text().splitlines()
               if l.strip() and not l.strip().startswith("#")]
    if not handles:
        sys.exit(f"No creators in {args.creators}")

    L = instaloader.Instaloader(download_pictures=False, download_videos=True, download_video_thumbnails=False,
                                download_geotags=False, download_comments=False, save_metadata=False,
                                compress_json=False, quiet=True)
    try:
        L.load_session_from_file(args.user)
    except FileNotFoundError:
        sys.exit(f"No saved session for {args.user}. Run:  instaloader --login {args.user}")

    now = datetime.now(timezone.utc)
    all_rows, failed = [], []
    for i, h in enumerate(handles, 1):
        print(f"[{i}/{len(handles)}] @{h} ...", end=" ", flush=True)
        try:
            followers, rows = pull_creator(L, h, args.posts)
        except Exception as e:  # private, renamed, rate-limited, etc.
            print(f"FAILED ({type(e).__name__}: {str(e)[:120]})")
            failed.append(h)
            continue
        vals = [r["views"] for r in rows if r["views"]]
        med = statistics.median(vals) if len(vals) >= 4 else None
        for r in rows:
            r["followers"] = followers
            r["median_views"] = round(med) if med else ""
            r["vs_usual"] = round(r["views"] / med, 1) if med and r["views"] else ""
            r["age_days"] = round((now - datetime.fromisoformat(r["posted_utc"])).total_seconds() / 86400, 1)
        all_rows += rows
        print(f"{len(rows)} reels, median {int(med):,} views" if med else f"{len(rows)} reels (too few for a median)")
        if i < len(handles):
            time.sleep(random.uniform(20, 40))  # be gentle: roughly human pace between profiles

    if not all_rows:
        sys.exit("Nothing pulled. Check the session (instaloader --login) and the handles.")

    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    stamp = now.strftime("%Y-%m-%d")
    cols = ["handle", "vs_usual", "views", "median_views", "likes", "comments", "age_days", "duration_s",
            "followers", "pinned", "posted_utc", "url", "shortcode", "caption"]
    with open(out / f"reels_{stamp}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(all_rows)

    outliers = sorted(
        [r for r in all_rows if r["vs_usual"] and r["vs_usual"] >= args.threshold and r["age_days"] >= args.min_age_days],
        key=lambda r: -r["vs_usual"])
    with open(out / f"outliers_{stamp}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(outliers)

    print(f"\n{len(all_rows)} reels saved -> {out / f'reels_{stamp}.csv'}")
    print(f"{len(outliers)} outliers (>= {args.threshold}x usual) -> {out / f'outliers_{stamp}.csv'}\n")
    for r in outliers[:15]:
        print(f"  {r['vs_usual']:>5}x  {r['views']:>11,}  @{r['handle']:<28} {r['caption'][:70]}")
    if failed:
        print(f"\nFailed: {', '.join('@' + h for h in failed)}")

    if args.download and outliers:
        vids = out / "videos"; vids.mkdir(exist_ok=True)
        print(f"\nDownloading {len(outliers)} outlier videos -> {vids}")
        for r in outliers:
            try:
                post = instaloader.Post.from_shortcode(L.context, r["shortcode"])
                L.download_post(post, target=vids / r["handle"])
                time.sleep(random.uniform(8, 15))
            except Exception as e:
                print(f"  skip {r['shortcode']}: {e}")


if __name__ == "__main__":
    main()
