"""One-time helper, run on your own computer: prints the YouTube refresh token for the GitHub secret.

    pip install google-auth-oauthlib
    python pipeline/get_youtube_token.py client_secret.json

A browser opens; sign in with the account that owns the channel and allow access.
"""
import json
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

if len(sys.argv) != 2:
    sys.exit("usage: python pipeline/get_youtube_token.py client_secret.json")

creds = InstalledAppFlow.from_client_secrets_file(sys.argv[1], SCOPES).run_local_server(port=0, prompt="consent")
client = json.load(open(sys.argv[1], encoding="utf-8"))
client = client.get("installed") or client.get("web")
print("\nضع هذه القيم في GitHub > Settings > Secrets and variables > Actions:\n")
print("YT_CLIENT_ID     =", client["client_id"])
print("YT_CLIENT_SECRET =", client["client_secret"])
print("YT_REFRESH_TOKEN =", creds.refresh_token)
