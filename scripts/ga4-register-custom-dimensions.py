#!/usr/bin/env python3
"""Register 14 GA4 custom dimensions via the Admin API.
Uses gog's stored refresh token + PKCE client_id to get an access token,
then calls the GA4 Admin API directly.
"""
import json, os, subprocess, sys, urllib.request, urllib.error

PROPERTY_ID = "519138010"
ACCOUNT_ID = "379951881"

# Load env vars from ~/.env
env_path = os.path.expanduser("~/.env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

GOG_BIN = os.environ.get("GOG_BIN", "/home/ramamos/.local/bin/gog")

# Step 1: Export refresh token from gog's keyring
print("→ Exporting refresh token from gog keyring...")
token_file = "/tmp/gog-tok-export.json"
result = subprocess.run(
    [GOG_BIN, "auth", "tokens", "export", "ramamos26@gmail.com",
     "--out", token_file, "--overwrite"],
    capture_output=True, text=True, env=os.environ
)
if result.returncode != 0:
    print(f"✗ Failed to export token: {result.stderr}")
    sys.exit(1)

with open(token_file) as f:
    token_data = json.load(f)
os.remove(token_file)

refresh_token = token_data.get("refresh_token")
if not refresh_token:
    print("✗ No refresh token in export")
    sys.exit(1)
print(f"✓ Got refresh token (len={len(refresh_token)})")

# Step 2: Read client_id from gog credentials
creds_path = os.path.expanduser("~/.local/share/gogcli/credentials.json")
with open(creds_path) as f:
    creds = json.load(f)
client_id = creds.get("client_id")
if not client_id:
    print("✗ No client_id in credentials.json")
    sys.exit(1)
print(f"✓ Got client_id: {client_id[:20]}...")

# Step 3: Exchange refresh token for access token
print("→ Exchanging refresh token for access token...")
data = urllib.parse.urlencode({
    "client_id": client_id,
    "refresh_token": refresh_token,
    "grant_type": "refresh_token",
}).encode()
req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
try:
    with urllib.request.urlopen(req) as resp:
        token_resp = json.loads(resp.read())
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"✗ Token exchange failed: HTTP {e.code}: {body}")
    # Try with client_secret if it's in the credentials
    client_secret = creds.get("client_secret", "")
    if client_secret:
        print("→ Retrying with client_secret...")
        data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }).encode()
        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
        with urllib.request.urlopen(req) as resp:
            token_resp = json.loads(resp.read())
    else:
        sys.exit(1)

access_token = token_resp.get("access_token")
if not access_token:
    print(f"✗ No access token in response: {token_resp}")
    sys.exit(1)
print(f"✓ Got access token (len={len(access_token)})")

# Step 4: Register the 14 custom dimensions
dimensions = [
    {"displayName": "Profile ID", "parameterName": "profile_id", "scope": "USER", "description": "User profile identifier"},
    {"displayName": "Node ID", "parameterName": "node_id", "scope": "EVENT", "description": "Story node identifier"},
    {"displayName": "Equation", "parameterName": "equation", "scope": "EVENT", "description": "Math equation presented"},
    {"displayName": "Response Time Ms", "parameterName": "response_time_ms", "scope": "EVENT", "description": "Time to answer in milliseconds"},
    {"displayName": "Game Mode", "parameterName": "game_mode", "scope": "EVENT", "description": "Arcade/practice/saga mode"},
    {"displayName": "User Agent", "parameterName": "user_agent", "scope": "EVENT", "description": "Browser user agent"},
    {"displayName": "Session Age", "parameterName": "session_age", "scope": "EVENT", "description": "Session duration in seconds"},
    {"displayName": "Streak Count", "parameterName": "streak_count", "scope": "EVENT", "description": "Current streak count"},
    {"displayName": "Powerup Type", "parameterName": "powerup_type", "scope": "EVENT", "description": "Power-up type used"},
    {"displayName": "Difficulty Level", "parameterName": "difficulty_level", "scope": "EVENT", "description": "Difficulty level"},
    {"displayName": "Correct Count", "parameterName": "correct_count", "scope": "EVENT", "description": "Number of correct answers"},
    {"displayName": "Wrong Count", "parameterName": "wrong_count", "scope": "EVENT", "description": "Number of wrong answers"},
    {"displayName": "Completion Status", "parameterName": "completion_status", "scope": "EVENT", "description": "Node completion status"},
    {"displayName": "Return Reason", "parameterName": "return_reason", "scope": "EVENT", "description": "Reason for returning to menu"},
]

api_url = f"https://analyticsadmin.googleapis.com/v1beta/properties/{PROPERTY_ID}/customDimensions"
headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

created = 0
skipped = 0
errors = 0

for dim in dimensions:
    body = json.dumps(dim).encode()
    req = urllib.request.Request(api_url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            print(f"✓ Created: {dim['parameterName']} ({dim['displayName']}) — {result.get('name', '?')}")
            created += 1
    except urllib.error.HTTPError as e:
        body_resp = e.read().decode()
        if "already exists" in body_resp.lower() or "ALREADY_EXISTS" in body_resp:
            print(f"→ Already exists: {dim['parameterName']} ({dim['displayName']})")
            skipped += 1
        else:
            print(f"✗ Error creating {dim['parameterName']}: HTTP {e.code}: {body_resp[:200]}")
            errors += 1

print(f"\n=== Results: {created} created, {skipped} already existed, {errors} errors ===")

# Step 5: List existing custom dimensions to verify
print("\n→ Listing all custom dimensions...")
req = urllib.request.Request(api_url, headers={"Authorization": f"Bearer {access_token}"})
try:
    with urllib.request.urlopen(req) as resp:
        listing = json.loads(resp.read())
        dims = listing.get("customDimensions", [])
        print(f"Total custom dimensions on property {PROPERTY_ID}: {len(dims)}")
        for d in dims:
            print(f"  - {d.get('parameterName', '?')} ({d.get('displayName', '?')}) [{d.get('scope', '?')}]")
except urllib.error.HTTPError as e:
    print(f"✗ Failed to list: HTTP {e.code}: {e.read().decode()[:200]}")