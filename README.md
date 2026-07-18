# 🤖 Personal AI Agent

A state-of-the-art Personal AI Assistant featuring a stunning Glassmorphism UI, real-time voice interactions, and a powerful backend brain powered by LangGraph, FastAPI, and Groq.

## 🚀 Live Demo

👉 **[Insert Live Demo Link Here]** 👈

## ✨ Features

- **Dynamic Conversational AI**: Powered by `langchain`, `langgraph`, and the blazing-fast `groq` API.
- **Tools & Capabilities**:
  - Real-time Web Search via DuckDuckGo
  - Real-time Weather retrieval (OpenWeatherMap)
- **Glassmorphism UI**: Beautiful, fully responsive, and modern React interface powered by Next.js.
- **Multilingual Support**: Switch seamlessly between English and Hindi.
- **Theming**: Integrated Dark Mode and Light Mode with live toggling.
- **File Uploads**: Automatically upload and summarize documents.
- **Voice Recognition**: Talk directly to your AI using the built-in Web Speech API.

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Vanilla CSS
- **Backend**: FastAPI, Python, SQLAlchemy, LangGraph
- **Database**: SQLite (local memory/disk for chat histories)

## 📦 Local Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/ParthAgarwal8619/personal-Ai-Agent.git
   cd personal-Ai-Agent
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or .\venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
   *Create a `.env` file in the backend folder with your keys:*
   ```env
   GROQ_API_KEY=your_groq_key
   OPENWEATHER_API_KEY=your_weather_key
   ```
   *Run the server:*
   ```bash
   uvicorn main:app --reload
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## ☁️ Deployment

This project includes a `render.yaml` Blueprint for easy deployment.
Simply connect this repository to your Render account as a Blueprint and both the Frontend and Backend will be deployed simultaneously!
