# 🚀 Lumina Setup Guide

This guide will help you set up Lumina on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and **npm** ([Download](https://nodejs.org/))
- **Python 3.10.x** (⚠️ **Not 3.11+, 3.14+**) ([Download](https://www.python.org/downloads/))
- **FFmpeg** for video processing ([Download](https://ffmpeg.org/download.html))
- **Google Gemini API Key** with billing enabled ([Get API Key](https://aistudio.google.com/apikey))

### Verifying Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check Python version (should be 3.10.x)
python3.10 --version

# Check FFmpeg
ffmpeg -version

# Check npm
npm --version
```

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Lumina.git
cd Lumina
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment with Python 3.10
python3.10 -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

### 3. Configure Backend Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your favorite editor
nano .env  # or vim, code, etc.
```

**Required Configuration:**
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Optional Configuration:**
```env
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=500
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
```

### 4. Start the Backend Server

```bash
# Make sure you're in the backend directory with venv activated
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
🚀 Lumina backend starting up...
```

The backend API will be available at **http://localhost:8000**

### 5. Frontend Setup (New Terminal)

Open a **new terminal** and navigate to the frontend directory:

```bash
cd frontend

# Install all npm dependencies
npm install

# (Optional) Configure frontend environment
cp .env.example .env.local
# The default API URL is already correct: http://localhost:8000/api
```

### 6. Start the Frontend Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Network:      http://YOUR_IP:3000

✓ Ready in X.Xs
```

The frontend will be available at **http://localhost:3000**

## 🎉 You're Ready!

1. Open your browser to **http://localhost:3000**
2. Paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=rEDzUT3ymw4`)
3. Wait 1-3 minutes for Gemini to analyze the video
4. Explore your interactive 3D skill tree!

---

## Common Issues & Solutions

### Issue: `ModuleNotFoundError: No module named 'greenlet'`

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install greenlet
```

### Issue: `SSL: CERTIFICATE_VERIFY_FAILED` (Corporate Networks)

**Solution:** Already handled! The code includes `--no-check-certificate` for yt-dlp.

### Issue: Frontend fonts not loading

**Solution:** Already fixed! Fonts are bundled locally in `frontend/public/fonts/`.

### Issue: `404 models/gemini-x.x not found`

**Solution:** 
- Ensure your Gemini API key has **billing enabled**
- Check that you're using a supported model (`gemini-2.5-flash`)
- Verify your API key at https://aistudio.google.com/apikey

### Issue: Python version conflicts

**Solution:**
```bash
# Check your Python version
python --version

# If it's not 3.10.x, install Python 3.10 and use it explicitly:
python3.10 -m venv venv
```

### Issue: Port already in use

**Backend (8000):**
```bash
# Find and kill the process using port 8000
# Mac/Linux:
lsof -ti:8000 | xargs kill -9
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Frontend (3000):**
```bash
# Mac/Linux:
lsof -ti:3000 | xargs kill -9
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## Development Tips

### Backend Development

```bash
# Run with auto-reload (already included with --reload flag)
uvicorn main:app --reload --port 8000

# Run tests
pytest

# Check logs
tail -f backend/logs/app.log
```

### Frontend Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Management

The backend uses SQLite for job tracking. The database file is created automatically at:
```
backend/lumina_jobs.db
```

To reset the database:
```bash
rm backend/lumina_jobs.db
# It will be recreated on next backend startup
```

---

## Project Structure

```
Lumina/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment configuration
│   ├── database.py          # SQLAlchemy setup
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Example environment variables
│   ├── .python-version      # Python version pinning
│   ├── models/              # Pydantic schemas & DB models
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic (Gemini, YouTube, etc.)
│   ├── workers/             # Background job processors
│   └── utils/               # Helper functions
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities (API client, types, store)
│   ├── public/              # Static assets (fonts, images)
│   ├── package.json         # Node dependencies
│   └── .env.example         # Example environment variables
└── README.md                # Project documentation
```

---

## Need Help?

- 📖 Check the main [README.md](./README.md) for architecture details
- 🐛 Open an issue on GitHub
- 💬 Check existing issues for solutions

Happy learning with Lumina! 🌟
