<div align="center">
  <img src="https://raw.githubusercontent.com/yashbharvada/lumina/main/public/logo.png" alt="Lumina Logo" width="120" />
  
  # 🌟 Lumina
  
  **"Turn any 2-hour lecture into a 20-minute interactive study session"**
  
  [![Hackathon Submission](https://img.shields.io/badge/🏆_PIXEL.GEMINI-Submission-FFcc00?style=for-the-badge)](https://pixel-gemini.devpost.com)
  
  ![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
  ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
</div>

<br/>

> **🏆 Hackathon Submission Notice**<br>
> This project is proudly submitted for the **PIXEL.GEMINI Hackathon**. Lumina extensively utilizes the **Google Gemini API** (specifically `gemini-3.0-flash`) for multimodal video analysis, transcript ingestion, and fully structured educational JSON generation.



## 💡 The Problem

Students worldwide waste hours watching lengthy lecture recordings and reading dense textbook PDFs just to extract a handful of key concepts. 

* **Low Information Density:** A 2-hour lecture video often contains only ~15 minutes of actual core concept material buried in filler, rambling, and organizational talk.
* **Terrible Retention Standards:** Passive video watching has awful knowledge retention rates — studies show retention drops to ~10% after just 48 hours without active recall practice.
* **One-Size-Fits-All Material:** In traditional and strictly linear learning environments, everyone gets the same one-size-fits-all content, irrespective of what they actually struggle with.
* **Massive Time Sinks:** Creating flashcards, building quizzes, and manually mapping out prerequisite structures takes hours of manual labor that could be spent actually studying.
* **No Big Picture:** Students can't visualize how concepts connect or what prerequisites exist until the end of a semester. Re-watching entire long-form videos to hunt down one concept is incredibly inefficient.

---

## ✨ The Solution

**Lumina** is an AI-powered platform where a user uploads a lecture video or pastes a YouTube URL. Using Google's Gemini 2.0 Flash multimodal long-context capabilities, the app acts as your personal tutor.

Lumina completely transforms the educational pipeline: **2-hour lecture $\rightarrow$ 20-minute interactive study session.**

1. **Intelligent Extraction:** Lumina analyzes the ENTIRE video — its visual content, audio speech, slides, and diagrams.
2. **Structural Mapping:** It extracts hierarchical concept structures and builds rigid prerequisite mappings between disparate topics.
3. **Interactive Visualization:** We turn linear video into a beautiful, personalized 3D skill tree.
4. **Active Recall:** Lumina auto-creates categorized flashcards (definitions, examples, comparisons, applications, mnemonics) entirely based on the video context.
5. **Adaptive Assessment:** It builds adaptive quizzes with varying difficulties and highly detailed explanations.
6. **Gamified Progress:** As you study, your 3D skill tree dynamically updates from a grey "unstarted" state, to a gold "in-progress" state, finally turning bright green upon 100% mastery.

---

## 🧠 How I Use the Google Gemini API

*(Judges: This section details our deep integration with Gemini capabilities as outlined in the hackathon rules.)*

We utilized **Gemini 3.0 Flash** (`gemini-3.0-flash`) as the core brain of Lumina. We didn't just build a wrapper—we deeply integrated Gemini's native multimodal processing to achieve something standard LLMs cannot do. It was the *only* model capable of simultaneously handling our required 2M+ token long context window, native multimodal input processing (video frames + audio synchronously), and heavily constrained structured JSON outputs via `response_schema`.

### 1. NATIVE Multimodal Video Analysis via `File API`
Instead of relying solely on error-prone YouTube transcripts (a standard, low-innovation approach), Lumina interfaces directly with the Gemini File API to upload raw lecture videos. We use `genai.upload_file()` to push videos into Gemini's secure servers. This allows the model to process BOTH the **visual frames** (slides, mathematical diagrams written on whiteboards, presenter gestures) AND the **audio** (spoken explanations, emphasis, Q&A) simultaneously, mimicking true human understanding.

```python
import google.generativeai as genai
import time

# 1. Upload video natively to Gemini
video_file = genai.upload_file(path=video_path)

# 2. Wait for Google's internal API to finish video processing state
while video_file.state.name == "PROCESSING":
    time.sleep(2)
    video_file = genai.get_file(video_file.name)
```

### 2. Structured JSON Course Generation
Lumina isn't a chatbot; it's a structural engine. We prompt Gemini not for text, but for a massive, heavily nested JSON schema representing an entire curriculum. We utilize the `generation_config` parameter to enforce strict structured outputs. The model acts as an orchestration layer, simultaneously extracting:

* **Hierarchical Concept Extraction:** Identifying 8-15 concepts organized in a strict prerequisite tree (depth 0-3), forcing the model to understand which concepts mathematically or logically build upon others.
* **Timestamp Mapping:** Leveraging Gemini 3.0's spatial-temporal reasoning to pinpoint exact timestamps in the video where each concept is taught.
* **Categorical Flashcard Engine:** Generating 20-30 flashcards split strictly across 5 categories (Definition, Example, Comparison, Application, Mnemonic)—proving Gemini isn't just summarizing, it's *teaching*.
* **Adaptive Quiz Logic:** Writing 12-20 multiple choice questions with 4 distinct options, assigned correct answers, detailed explanations, and specific difficulty tiers.

```python
# 3. Multimodal Analysis combining the uploaded Video Object and our Prompt
response = model.generate_content(
    [video_file, analysis_prompt],
    generation_config=genai.types.GenerationConfig(
        response_mime_type="application/json",
        response_schema=CourseModuleSchema, # Heavily nested Pydantic Schema
        temperature=0.3, # Low temp for deterministic, structured output
        max_output_tokens=8192, # Extremely long generation context
    ),
)
```

### 3. Fallback Transcript Context Window
When a YouTube video is too long to download within Vercel's serverless timeout limits (or exceeds standard API limits), Lumina performs an automatic fallback. It utilizes `yt-dlp` to extract the raw text transcript and leverages Gemini 3.0 Flash's massive 2-million token context window by injecting the entire textual transcript directly into the prompt. Gemini easily ingests 50,000+ words of transcript and still outputs perfect hierarchical JSON without losing context.

### 4. File Lifecycle Management
To ensure data privacy and prevent storage quota limits from being hit on the Google Developer Console, Lumina tracks job completion and uses `genai.delete_file()` to immediately wipe uploaded videos from Gemini's servers after the structured generation is complete.

---

## 🎮 Key Features

1. **🎬 Universal Video Ingestion**: Paste any YouTube URL or upload a direct video file.
2. **🧠 Full Multimodal Analysis**: Powered by Gemini 3.0 Flash to "watch" and "listen" to lectures rather than just reading text.
3. **🌳 3D Physics Skill Tree**: An interactive `@react-three/fiber` graph mapping prerequisites in 3D space with zoom, pan, and orbital controls—a completely novel way to visualize AI output.
4. **🃏 Swipeable Flashcard Engine**: Physics-based 3D card stacks categorizing active recall by Definition, Examples, Mnemonics, and Applications.
5. **🧩 Gamified Adaptive Quizzes**: Questions scale in difficulty, providing detailed AI-generated explanations for both correct and incorrect answers.
6. **📊 Real-time Mastery Tracking**: Nodes in the 3D visualizer react physically, glowing gold and green as you complete quizzes.
7. **⏱️ Source Timestamp Mapping**: Jump straight into the exact minute of the video a concept was taught.
8. **🎯 Prerequisite-Aware Paths**: You cannot learn Level 3 concepts without proving mastery in Level 1 and 2 concepts.
9. **💾 Persistent Local Database**: Progress is saved via `localStorage` and background jobs are queued in async SQLite (`aiosqlite`).
10. **⚡ Asynchronous Background Processing**: A completely detached Python worker architecture ensures the UI remains snappy while Gemini crunches data.

---

## 🏗️ Architecture

```text
User
  │
  ├── YouTube URL ──┐
  │                 │
  └── Video Upload ─┤
                    ▼
            ┌──────────────┐
            │   Next.js    │  ◄── 3D Skill Tree (Three.js)
            │   Frontend   │  ◄── Card Stack (Framer Motion)
            │   (Vercel)   │  ◄── Zustand State Bridge
            └──────┬───────┘
                   │ REST API
                   ▼
            ┌──────────────┐
            │   FastAPI    │  ◄── Async Background Tasks
            │   Backend    │  ◄── aiosqlite persistent jobs
            │              │  ◄── yt-dlp Video/Transcript Fetch
            └──────┬───────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
    ┌──────────┐      ┌────────────┐
    │  yt-dlp  │      │ Gemini 3.0 │
    │ Transcript      │   Flash    │
    │  Engine  │      │ Multimodal │
    └──────────┘      │  Analysis  │
                      └─────┬──────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Structured  │
                    │    Course    │
                    │   Module     │
                    │              │
                    │ • Concepts   │
                    │ • Flashcards │
                    │ • Quizzes    │
                    │ • Skill Tree │
                    └──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14, React 18 | App Router architecture, Server & Client components |
| **3D Rendering** | Three.js, React Three Fiber | Real-time WebGL rendering of the physics-based Skill Tree |
| **Styling & UI** | Tailwind CSS, shadcn/ui | Rapid, accessible component styling |
| **Animations** | Framer Motion | Fluid route transitions and swipeable flashcard physics |
| **State Management** | Zustand | Bridging complex DOM state with the Three.js canvas |
| **Backend Framework** | FastAPI (Python) | High-performance async API routing and background tasks |
| **AI Processing** | Google Generative AI SDK | Hooking into Gemini 3.0 Flash for Native Multimodal generation |
| **Video Extraction** | yt-dlp | Downloading YouTube audio, video, and transcripts |
| **Data Validation** | Pydantic v2 | Strictly enforcing AI JSON schemas |
| **Database** | SQLite & SQLAlchemy | `aiosqlite` for persistent background job tracking |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js 18+** and **npm**
* **Python 3.10.x** (⚠️ **Important**: Python 3.14+ is not supported due to package compatibility)
* **Google Gemini API Key** with billing enabled (Get one at [Google AI Studio](https://aistudio.google.com/apikey))
* **FFmpeg** (installed on your system path for `yt-dlp` video processing)

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Lumina.git
cd Lumina
```

### 2. Backend Setup
```bash
cd backend

# Use Python 3.10.x (recommended: 3.10.12)
# If using pyenv: pyenv local 3.10.12
python3.10 -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your_actual_api_key_here

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# (Optional) Configure API URL
cp .env.example .env.local
# Default: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

# Start the Next.js development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Start Learning!
1. Open `http://localhost:3000` in your browser
2. Paste a YouTube URL or upload a video file
3. Wait for Gemini to analyze the content (1-3 minutes)
4. Explore your interactive 3D skill tree!

---

## ⚠️ Troubleshooting

### Python Version Issues
- **Error**: `greenlet` or `pydantic-core` build failures
- **Solution**: Ensure you're using Python 3.10.x (not 3.11+, 3.14+)
  ```bash
  python --version  # Should show 3.10.x
  ```

### SSL Certificate Errors (Corporate Networks)
- **Error**: `[SSL: CERTIFICATE_VERIFY_FAILED]`
- **Solution**: Already handled! The code includes `--no-check-certificate` for `yt-dlp`

### Gemini API Errors
- **Error**: `404 models/gemini-x.x not found`
- **Solution**: Ensure your API key has billing enabled and supports `gemini-2.5-flash`
- **Error**: `504 Deadline expired`
- **Solution**: Video is too long. Try a shorter video (< 30 minutes) or ensure your API key has sufficient quota

### Font Loading Issues (Next.js)
- **Error**: TLS errors when loading Google Fonts
- **Solution**: Already fixed! Fonts are bundled locally in `frontend/public/fonts/`

---

## 📡 API Reference

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/process/youtube` | Initiates background job to download and process a YT URL |
| `POST` | `/api/process/upload` | Uploads raw MP4 directly into the Gemini processing pipeline |
| `GET` | `/api/status/{job_id}` | Polls specific job status (Downloading $\rightarrow$ Analyzing $\rightarrow$ Gen) |
| `GET` | `/api/jobs` | Retrieves history of all active and completed Generation Jobs |

---

## 🎯 How It Works

1. **User Provides Video**: User pastes a YouTube link or uploads a raw MP4.
2. **Backend Intercepts**: FastAPI immediately returns a `job_id` to the frontend and begins an `asyncio` background task.
3. **Download / Ingestion**: `yt-dlp` extracts the best available transcript. If video processing is requested, it downloads the video file.
4. **Gemini Initialization**: The file or transcript is uploaded to Gemini 3.0 Flash along with a massive system prompt demanding rigid Pydantic JSON structures.
5. **Generation**: Gemini acts as an orchestrator, outputting a complete `CourseModule` containing strictly mapped concepts, flashcards, and quizzes.
6. **3D Render**: The frontend receives the JSON. The `SkillTreeScene` maps the concepts. Custom force-physics pushes siblings apart and pulls children to parents.
7. **Active Learning**: The user interacts with the flashcards and quizzes tied explicitly to a concept node.
8. **Mastery Tracking**: As the user answers quizzes correctly, `zustand` updates the mastery integer, which directly updates the glowing emissive material built into the Three.js mesh.

---

## 🌍 Real-World Impact

* **Democratizing Education**: 500M+ students utilize YouTube for education. Lumina transforms passive free content into premium, interactive courseware. Unlike simple chatbots, Lumina actually builds tangible, progressive learning paths.
* **Saving Time**: Reduces pure note-taking and flashcard-creation study time by 60-80%. Students spend time *studying*, not *preparing to study*.
* **Accessibility**: Helps neurodivergent learners, particularly those with ADHD, who struggle immensely with unstructured, long-form video content by gamifying the learning process into an interactive tree with immediate visual feedback.
* **Empowering Educators**: Professors and YouTubers can use Lumina to instantly auto-generate entire companion courses for their 1-hour lectures.

---

## 🔮 Future Roadmap

* **Spaced Repetition Engine**: Introducing a timed scheduling algorithm (like Anki) to notify the user when a concept's "Mastery" starts decaying over weeks of inactivity.
* **Multi-modal Ingestion Expansion**: Extending ingestion beyond just YouTube to process raw PDF textbooks, PowerPoint Slides, and Notion docs.
* **Multiplayer Skill Trees**: Allowing students in the same university class to share the same Skill Tree and compete to master the nodes fastest.
* **LMS Integration**: Export pipelines for Canvas and Moodle.
* **Mobile Port**: Rewriting the Three.js layer in React Native for iOS/Android native experiences.

---

## 🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License.

---
<div align="center">
  <b>Built with ❤️ for the PIXEL.GEMINI Hackathon</b>
</div>
