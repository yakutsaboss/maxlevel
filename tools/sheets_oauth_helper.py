#!/usr/bin/env python3
"""
Google Sheets OAuth Helper — Non-Interactive OAuth for Telegram Bot
Part of the WAT Framework (Tools Layer)

Supports three modes:
  1. Generate auth URL:  python sheets_oauth_helper.py --generate-url
  2. Exchange code:      python sheets_oauth_helper.py --exchange-code AUTH_CODE
  3. Check status:       python sheets_oauth_helper.py --check-status

Used by the notification bot's /sheets_login, /sheets_code, /sheets_status commands.
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = Path(__file__).parent.parent.absolute()

# Paths for OAuth files
CREDENTIALS_FILE = PROJECT_ROOT / "credentials.json"
TOKEN_FILE = PROJECT_ROOT / "token.json"

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'


def generate_auth_url() -> dict:
    """Generate an OAuth consent URL for manual authorization.

    Returns dict with 'success', 'url', or 'error'.
    """
    if not CREDENTIALS_FILE.exists():
        return {
            "success": False,
            "error": (
                f"credentials.json not found at {CREDENTIALS_FILE}\n"
                "Download OAuth2 client credentials from Google Cloud Console:\n"
                "1. Go to console.cloud.google.com → APIs & Services → Credentials\n"
                "2. Create an OAuth 2.0 Client ID (type: Desktop app)\n"
                "3. Download JSON and save as credentials.json in project root"
            )
        }

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow

        flow = InstalledAppFlow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI,
        )
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',
        )
        return {"success": True, "url": auth_url}
    except Exception as e:
        return {"success": False, "error": str(e)}


def exchange_code(auth_code: str) -> dict:
    """Exchange an authorization code for OAuth tokens.

    Saves the resulting token to token.json.
    Returns dict with 'success' or 'error'.
    """
    if not CREDENTIALS_FILE.exists():
        return {
            "success": False,
            "error": "credentials.json not found. Run --generate-url first."
        }

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow

        flow = InstalledAppFlow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI,
        )
        flow.fetch_token(code=auth_code.strip())
        creds = flow.credentials

        # Save token
        token_data = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': list(creds.scopes) if creds.scopes else SCOPES,
        }
        with open(TOKEN_FILE, 'w') as f:
            json.dump(token_data, f, indent=2)

        return {
            "success": True,
            "message": "Google Sheets authorized successfully! Token saved.",
        }
    except Exception as e:
        error_msg = str(e)
        if 'invalid_grant' in error_msg.lower():
            return {
                "success": False,
                "error": "Invalid or expired code. Generate a new URL with /sheets_login and try again."
            }
        return {"success": False, "error": error_msg}


def check_status() -> dict:
    """Check if OAuth token exists and is valid.

    Returns dict with 'success', 'status', 'details'.
    """
    if not TOKEN_FILE.exists():
        return {
            "success": True,
            "status": "not_configured",
            "message": "No OAuth token found. Use /sheets_login to authorize.",
        }

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

        if creds.valid:
            return {
                "success": True,
                "status": "valid",
                "message": "Google Sheets is connected and token is valid.",
            }

        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                # Save refreshed token
                token_data = {
                    'token': creds.token,
                    'refresh_token': creds.refresh_token,
                    'token_uri': creds.token_uri,
                    'client_id': creds.client_id,
                    'client_secret': creds.client_secret,
                    'scopes': list(creds.scopes) if creds.scopes else SCOPES,
                }
                with open(TOKEN_FILE, 'w') as f:
                    json.dump(token_data, f, indent=2)
                return {
                    "success": True,
                    "status": "refreshed",
                    "message": "Token was expired but refreshed successfully.",
                }
            except Exception as e:
                return {
                    "success": True,
                    "status": "expired",
                    "message": f"Token expired and refresh failed: {e}\nUse /sheets_login to re-authorize.",
                }

        return {
            "success": True,
            "status": "expired",
            "message": "Token expired with no refresh token. Use /sheets_login to re-authorize.",
        }
    except Exception as e:
        return {
            "success": True,
            "status": "error",
            "message": f"Error reading token: {e}",
        }


def load_oauth_credentials():
    """Load OAuth credentials from token.json if available.

    Returns google.oauth2.credentials.Credentials or None.
    Used by sheets_analytics_export.py as an alternative to service account auth.
    """
    if not TOKEN_FILE.exists():
        return None

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save refreshed token
            token_data = {
                'token': creds.token,
                'refresh_token': creds.refresh_token,
                'token_uri': creds.token_uri,
                'client_id': creds.client_id,
                'client_secret': creds.client_secret,
                'scopes': list(creds.scopes) if creds.scopes else SCOPES,
            }
            with open(TOKEN_FILE, 'w') as f:
                json.dump(token_data, f, indent=2)

        if creds.valid:
            return creds
        return None
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description='Google Sheets OAuth Helper')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--generate-url', action='store_true',
                       help='Generate OAuth consent URL')
    group.add_argument('--exchange-code', type=str, metavar='CODE',
                       help='Exchange authorization code for tokens')
    group.add_argument('--check-status', action='store_true',
                       help='Check if OAuth token is valid')

    args = parser.parse_args()

    if args.generate_url:
        result = generate_auth_url()
    elif args.exchange_code:
        result = exchange_code(args.exchange_code)
    elif args.check_status:
        result = check_status()

    print(json.dumps(result, indent=2))
    return 0 if result.get("success") else 1


if __name__ == '__main__':
    sys.exit(main())
