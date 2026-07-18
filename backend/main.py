from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uvicorn
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

from agent.graph import graph
from langchain_core.messages import HumanMessage, AIMessage
from database import engine, get_db, Base
import models

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Personal Assistant API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default_thread"

class ChatResponse(BaseModel):
    response: str

@app.get("/api")
def read_root():
    return {"status": "ok", "message": "AI Personal Assistant Backend is running"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # Load previous history from DB
        history = db.query(models.ChatHistory).filter(
            models.ChatHistory.thread_id == request.thread_id
        ).order_by(models.ChatHistory.id).all()
        
        # Convert DB history to Langchain messages
        messages = []
        for h in history:
            if h.role == "user":
                messages.append(HumanMessage(content=h.content))
            else:
                messages.append(AIMessage(content=h.content))
        
        # Add the new user message
        messages.append(HumanMessage(content=request.message))
        
        # Save user message to DB
        user_msg = models.ChatHistory(thread_id=request.thread_id, role="user", content=request.message)
        db.add(user_msg)
        db.commit()

        # Check if we have a valid key first
        import os
        if os.getenv("GROQ_API_KEY", "mock_key") == "mock_key":
            final_message = f"I am running in mock mode because no valid GROQ_API_KEY was found in backend/.env. You said: '{request.message}'. Please update the .env file with your free Groq API key to enable my AI brain!"
        else:
            # Run the graph
            config = {"configurable": {"thread_id": request.thread_id}}
            inputs = {"messages": messages}
            result = graph.invoke(inputs, config)
            
            # Get the last AI message
            final_message = result["messages"][-1].content
        
        # Save bot message to DB
        bot_msg = models.ChatHistory(thread_id=request.thread_id, role="bot", content=final_message)
        db.add(bot_msg)
        db.commit()
        
        return ChatResponse(response=final_message)
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg and "invalid_api_key" in error_msg.lower():
            final_message = "Authentication Error: Your Groq API key is invalid. Please check the backend/.env file and ensure GROQ_API_KEY is correct."
            return ChatResponse(response=final_message)
            
        print(f"Error in chat: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/chat/history")
def get_chat_history(thread_id: str = "dashboard_user", db: Session = Depends(get_db)):
    history = db.query(models.ChatHistory).filter(
        models.ChatHistory.thread_id == thread_id
    ).order_by(models.ChatHistory.id).all()
    
    return [{"role": h.role, "content": h.content} for h in history]

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save the file locally
    file_path = os.path.join("uploads", file.filename)
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return {"filename": file.filename, "status": "uploaded"}

@app.get("/api/reminders")
def get_reminders(db: Session = Depends(get_db)):
    reminders = db.query(models.Reminder).order_by(models.Reminder.created_at.desc()).all()
    return [{"id": r.id, "task": r.task, "time": r.time, "created_at": r.created_at} for r in reminders]

@app.get("/api/files")
def list_files():
    if not os.path.exists("uploads"):
        return []
    
    files_list = []
    for f in os.listdir("uploads"):
        filepath = os.path.join("uploads", f)
        if os.path.isfile(filepath):
            stat = os.stat(filepath)
            files_list.append({
                "name": f,
                "size": stat.st_size,
                "created_at": stat.st_ctime
            })
    return files_list

@app.get("/api/settings")
def get_settings():
    groq_key = os.getenv("GROQ_API_KEY", "")
    weather_key = os.getenv("OPENWEATHER_API_KEY", "")
    theme = os.getenv("APP_THEME", "dark")
    language = os.getenv("APP_LANGUAGE", "en")
    return {
        "groq_connected": bool(groq_key and groq_key != "mock_key"),
        "weather_connected": bool(weather_key),
        "groq_key": groq_key if groq_key != "mock_key" else "",
        "weather_key": weather_key,
        "theme": theme,
        "language": language
    }

class SettingsUpdate(BaseModel):
    groq_key: str
    weather_key: str
    theme: str = "dark"
    language: str = "en"

@app.post("/api/settings")
def update_settings(settings: SettingsUpdate):
    env_path = ".env"
    
    # Read existing env lines
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
            
    # Update or add keys
    groq_found = False
    weather_found = False
    theme_found = False
    lang_found = False
    
    for i, line in enumerate(lines):
        if line.startswith("GROQ_API_KEY="):
            lines[i] = f"GROQ_API_KEY={settings.groq_key}\n"
            groq_found = True
        elif line.startswith("OPENWEATHER_API_KEY="):
            lines[i] = f"OPENWEATHER_API_KEY={settings.weather_key}\n"
            weather_found = True
        elif line.startswith("APP_THEME="):
            lines[i] = f"APP_THEME={settings.theme}\n"
            theme_found = True
        elif line.startswith("APP_LANGUAGE="):
            lines[i] = f"APP_LANGUAGE={settings.language}\n"
            lang_found = True
            
    if not groq_found:
        lines.append(f"GROQ_API_KEY={settings.groq_key}\n")
    if not weather_found:
        lines.append(f"OPENWEATHER_API_KEY={settings.weather_key}\n")
    if not theme_found:
        lines.append(f"APP_THEME={settings.theme}\n")
    if not lang_found:
        lines.append(f"APP_LANGUAGE={settings.language}\n")
        
    with open(env_path, "w") as f:
        f.writelines(lines)
        
    # Update current process environment
    os.environ["GROQ_API_KEY"] = settings.groq_key
    os.environ["OPENWEATHER_API_KEY"] = settings.weather_key
    os.environ["APP_THEME"] = settings.theme
    os.environ["APP_LANGUAGE"] = settings.language
    
    return {"status": "success"}

# Serve Frontend static files
frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend/out")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if not full_path:
        full_path = "index.html"
        
    path = os.path.join(frontend_dir, full_path)
    if os.path.exists(path) and os.path.isfile(path):
        return FileResponse(path)
        
    # Fallback to index.html for SPA routing
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"error": "Frontend not built. Please run 'npm run build' in the frontend directory."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
