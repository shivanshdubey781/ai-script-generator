import requests
import time
import os
from dotenv import load_dotenv
from pathlib import Path

# Load from backend/.env
env_path = Path(__file__).parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

API_KEY = os.environ.get("JSON2VIDEO_API_KEY")
if API_KEY:
    API_KEY = API_KEY.strip()
print("Using API KEY:", API_KEY[:6] + "..." if API_KEY else None)

BASE_URL = "https://api.json2video.com/v2"
HEADERS = {"x-api-key": API_KEY, "Content-Type": "application/json"}

# 1. Submit a simple test video
payload = {
    "comment": "Test video from ai-script-generator",
    "resolution": "full-hd",
    "quality": "high",
    "scenes": [
        {
            "comment": "Scene 1 - Hook",
            "background-color": "#1a1a2e",
            "duration": 5,
            "elements": [
                {
                    "type": "text",
                    "style": "009",
                    "text": "Your AI Script Generator",
                    "y-align": "center",
                    "x-align": "center",
                    "duration": 5
                }
            ]
        }
    ]
}

print("Submitting movie...")
r = requests.post(f"{BASE_URL}/movies", headers=HEADERS, json=payload)
print("Submit status:", r.status_code)
try:
    response_json = r.json()
    print("Response:", response_json)
    project_id = response_json.get("project")
except Exception as e:
    print("Error parsing response:", e)
    print("Raw response text:", r.text)
    exit(1)

if not project_id:
    print("Error: No project ID returned!")
    exit(1)

# 2. Poll until done
print(f"Polling movie {project_id}...")
for i in range(30):
    time.sleep(5)
    status_r = requests.get(
        f"{BASE_URL}/movies?project={project_id}",
        headers=HEADERS
    ).json()
    status = status_r.get("movie", {}).get("status")
    print(f"Status: {status}")
    if status == "done":
        print("Video URL:", status_r["movie"]["url"])
        break
    elif status == "failed":
        print("Failed:", status_r)
        break
else:
    print("Polling timed out!")
