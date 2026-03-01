import re

pattern = re.compile(
    r"^(https?://)?(www\.)?"
    r"(youtube\.com/(watch\?v=|embed/|v/|shorts/)|youtu\.be/)"
    r"[\w\-]{11}"
)

urls = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=4s",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ", # ah! mobile web
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=abc", # invalid 3 chars
    "https://www.youtube.com/watch?v=k-a_B1C2D3E" # dashes/underscores
]

for url in urls:
    match = pattern.search(url.strip())
    print(f"URL: {url} -> VALID: {bool(match)}")
