@echo off
REM Radar helper for Windows: double-click to start.
REM Before the first run: log into the SCRAPING Instagram account in Firefox.
cd /d "%~dp0"
where python >nul 2>nul || (
  echo Python is not installed. Get it from https://www.python.org/downloads/ and tick "Add Python to PATH".
  pause & exit /b 1
)
python -m pip install --quiet --disable-pip-version-check instaloader==4.14.1 browser_cookie3
python agent.py --browser firefox
pause
