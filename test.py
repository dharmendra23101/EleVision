import requests
import time
import random
from datetime import datetime

# -----------------------------
# IoT Device Information
# -----------------------------
DEVICE_ID = "cam001"
DEVICE_PASSWORD = "12345"
SIM_NUMBER = "9998899977"

# -----------------------------
# Supabase Edge Function URL
# -----------------------------
API_URL = "https://jxxqccijzqkdfgpxrxny.supabase.co/functions/v1/iot-upload"

# -----------------------------
# Authorization header (use anon key)
# -----------------------------
HEADERS = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eHFjY2lqenFrZGZncHhyeG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzY1NDMsImV4cCI6MjA3OTA1MjU0M30.qzO_LtCa09dmyNbsWwVIns9Xa0zsERsl6NOSxR7rtao"
}

# -----------------------------
# Correct timestamp format for Supabase (ISO 8601)
# -----------------------------
iso_timestamp = datetime.utcnow().isoformat() + "Z"

payload = {
    "id": DEVICE_ID,
    "password": DEVICE_PASSWORD,
    "sim_number": SIM_NUMBER,

    "longitude": 82.909 + random.random() / 100,
    "latitude": 21.807 + random.random() / 100,

    "image_found": random.choice([True, False]),
    "voice_found": random.choice([True, False]),

    "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXTAoYklNeJCWp6CyeVwTTQgjFFXDGlNeY-w&s",
    "voice_url": "https://www.fesliyanstudios.com/play-mp3/387",

    "timestamp": iso_timestamp   # fixed!
}

print("Sending fake IoT data...")
response = requests.post(API_URL, headers=HEADERS, json=payload)

print("Status Code:", response.status_code)
print("Response:")
print(response.text)
