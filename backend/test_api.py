import requests

url = "http://localhost:8000/api/process/youtube"
payload = {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
headers = {"Content-Type": "application/json"}

response = requests.post(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Response:", response.text)
