#!/bin/bash
# Radar helper for Mac: double-click to start.
# Before the first run: log into the SCRAPING Instagram account in Firefox.
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null; then
  echo "Python 3 is not installed. Get it from https://www.python.org/downloads/"
  read -n 1 -s -r -p "Press any key to close"; exit 1
fi
python3 -m pip install --quiet --disable-pip-version-check --user instaloader==4.14.1 browser_cookie3
python3 agent.py --browser firefox
read -n 1 -s -r -p "Press any key to close"
