# Radar — tracking what's working for other creators

Radar lives under **Ideas → Radar**. It collects posts from competitors and viral
hashtags, ranks them by how much better they did than that creator's usual, and
turns the winners into transcripts, breakdowns and swipe-file entries.

## Setup (one time)

1. **Database:** paste the "Radar" section at the bottom of `supabase/schema.sql`
   into the Supabase SQL editor and run it.
2. **Env vars** (Vercel → Settings → Environment Variables):
   - `GROQ_API_KEY` — already used by the AI assistant; also powers transcription + breakdowns.
   - `APIFY_TOKEN` — from apify.com → Settings → Integrations. Needed for the
     "Pull latest" and hashtag buttons. Import works without it.
   - Optional: `APIFY_PROFILE_ACTOR` (default `apify/instagram-reel-scraper`),
     `APIFY_HASHTAG_ACTOR` (default `apify/instagram-hashtag-scraper`).

## Connect your computer (main way to pull competitors)

Many drinks accounts are age-restricted, so they can only be read by a logged-in
account. That account must log in from your own computer: Instagram flags logins
from cloud servers. So scraping runs in a small helper on your machine, and the
app controls it.

1. `pip install instaloader==4.14.1`
2. `instaloader --login YOUR_SCRAPING_ACCOUNT` (once; the password stays local)
3. In the app: **Radar → Connect your computer → Generate token**
4. From `scripts/ig_radar`, run the command the dialog shows:
   `python agent.py --app https://your-app.vercel.app --token rdr_… --user YOUR_SCRAPING_ACCOUNT`

Leave it running. **Pull latest** in the app is picked up within ~2 minutes,
results stream into Radar creator by creator, and it auto-pulls if the last pull
was 7+ days ago. The status dot under the button shows if it's online.
Requires `SUPABASE_SERVICE_ROLE_KEY` in Vercel (already used by other routes).

## Other ways to get data in

| Way | Needs | Best for |
| --- | --- | --- |
| **Pull latest** with the helper offline | `APIFY_TOKEN` | Public profiles only |
| **Discover by hashtag** | `APIFY_TOKEN` | Finding viral posts outside your watchlist |
| **Import yt-dlp / Apify JSON** | nothing | Data you've already scraped yourself |

For the import, `yt-dlp --dump-json <url> > posts.jsonl` (or `--write-info-json`
files) can be dropped straight in. Apify dataset exports (JSON) work too.

## Reading the feed

- **vs usual** = post views ÷ that creator's median views (likes if views are missing).
  Needs at least 4 posts from the creator. 🔥 = 3× or more. That's the signal.
  Raw views mostly reflect account size.
- **Break down top 10** transcribes (Groq Whisper) and analyzes the top 10
  un-analyzed videos in the current list: hook, hook type, format, why it worked,
  reusable template, and an idea for our own version.
- Transcripts: auto from Apify video links (they expire after a while; re-pull if
  so), or **Upload audio** (`yt-dlp -x` makes small files; keep under ~4 MB on
  Vercel), or paste one in.
- **Save to Swipe File** copies the post plus its breakdown into the existing swipe file.

Every pull appends a metrics snapshot per post, so re-pulling over time builds
a view history.
