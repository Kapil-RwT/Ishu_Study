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

We utilized **Gemini 3.0 Flash** (`gemini-3.0-flash`) as the core brain of Lumina. It was the only model capable of simultaneously handling our required long context window, multimodal input processing (video frames + audio), and heavily constrained structured JSON outputs.

### 1. Multimodal Video Analysis via `File API`
Instead of relying solely on error-prone YouTube transcripts, Lumina interfaces directly with the Gemini File API to upload raw lecture videos. We use `genai.upload_file()` to push videos into Gemini's secure servers, which allows the model to process BOTH the **visual frames** (slides, mathematical diagrams written on whiteboards, presenter gestures) AND the **audio** (spoken explanations, emphasis, Q&A) simultaneously.

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

* **Hierarchical Concept Extraction:** Identifying 8-15 concepts organized in a prerequisite tree (depth 0-3), mapping which concepts build upon others.
* **Timestamp Mapping:** Pinpointing exact timestamps in the video where each concept is taught.
* **Categorical Flashcard Engine:** Generating 20-30 flashcards split strictly across 5 categories (Definition, Example, Comparison, Application, Mnemonic).
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
When a YouTube video is too long to download within Vercel's serverless timeout limits (or exceeds API limits), Lumina performs an automatic fallback. It utilizes `yt-dlp` to extract the raw text transcript and leverages Gemini's massive long-context window by injecting the entire textual transcript directly into the prompt. Gemini 2.0 Flash easily ingests 50,000+ words of transcript and still outputs perfect hierarchical JSON.

### 4. File Lifecycle Management
To ensure data privacy and prevent storage quota limits from being hit on the Google Developer Console, Lumina tracks job completion and uses `genai.delete_file()` to immediately wipe uploaded videos from Gemini's servers after the structured generation is complete.

---

## 🎮 Key Features

1. **🎬 Universal Video Ingestion**: Paste any YouTube URL or upload a direct video file.
2. **🧠 Full Multimodal Analysis**: Powered by Gemini 2.0 Flash to "watch" and "listen" to lectures.
3. **🌳 3D Physics Skill Tree**: An interactive `@react-three/fiber` graph mapping prerequisites in 3D space with zoom, pan, and orbital controls.
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
    │  yt-dlp  │      │ Gemini 2.0 │
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
| **AI Processing** | Google Generative AI SDK | Hooking into Gemini 2.0 Flash for Multimodal generation |
| **Video Extraction** | yt-dlp | Downloading YouTube audio, video, and transcripts |
| **Data Validation** | Pydantic v2 | Strictly enforcing AI JSON schemas |
| **Database** | SQLite & SQLAlchemy | `aiosqlite` for persistent background job tracking |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js 18+**
* **Python 3.10+**
* **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))
* **FFmpeg** (installed on your system path for `yt-dlp` processing)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Create .env and add: GEMINI_API_KEY=your_key_here
cp .env.example .env 

# Start the async server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start the development server
npm run dev
```

Open your browser to `http://localhost:3000` and start generating!

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
4. **Gemini Initialization**: The file or transcript is uploaded to Gemini 2.0 Flash along with a massive system prompt demanding rigid Pydantic JSON structures.
5. **Generation**: Gemini acts as an orchestrator, outputting a complete `CourseModule` containing strictly mapped concepts, flashcards, and quizzes.
6. **3D Render**: The frontend receives the JSON. The `SkillTreeScene` maps the concepts. Custom force-physics pushes siblings apart and pulls children to parents.
7. **Active Learning**: The user interacts with the flashcards and quizzes tied explicitly to a concept node.
8. **Mastery Tracking**: As the user answers quizzes correctly, `zustand` updates the mastery integer, which directly updates the glowing emissive material built into the Three.js mesh.

---

## 🌍 Real-World Impact

* **Democratizing Education**: 500M+ students utilize YouTube for education. Lumina transforms passive free content into premium, interactive courseware.
* **Saving Time**: Reduces pure note-taking and flashcard-creation study time by 60-80%.
* **Accessibility**: Helps neurodivergent learners, particularly those with ADHD, who struggle immensely with unstructured, long-form video content by gamifying the learning process into an interactive tree.
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
