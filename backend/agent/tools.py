from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
import datetime
import os
import json

@tool
def web_search_tool(query: str) -> str:
    """Search the web for information using DuckDuckGo."""
    try:
        search = DuckDuckGoSearchRun()
        return search.invoke(query)
    except Exception as e:
        return f"Error during web search: {str(e)}"

@tool
def weather_tool(location: str) -> str:
    """Get the current weather for a specific location using OpenWeatherMap."""
    import httpx
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key or api_key == "mock_key":
        return f"The weather in {location} is currently sunny and 75°F (mocked data, missing API key)."
    
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=imperial"
    try:
        response = httpx.get(url)
        if response.status_code == 200:
            data = response.json()
            temp = data["main"]["temp"]
            desc = data["weather"][0]["description"]
            return f"The current weather in {location} is {temp}°F with {desc}."
        else:
            return f"Failed to get weather for {location}: {response.status_code}"
    except Exception as e:
        return f"Error fetching weather: {str(e)}"

@tool
def create_reminder_tool(reminder: str, time: str) -> str:
    """Create a reminder for the user."""
    from database import SessionLocal
    import models
    
    db = SessionLocal()
    try:
        new_reminder = models.Reminder(task=reminder, time=time)
        db.add(new_reminder)
        db.commit()
        return f"Reminder created: '{reminder}' at {time}"
    except Exception as e:
        return f"Failed to create reminder: {str(e)}"
    finally:
        db.close()

@tool
def read_file_tool(filename: str) -> str:
    """Read the contents of an uploaded file."""
    filepath = os.path.join("uploads", filename)
    if not os.path.exists(filepath):
        return f"File '{filename}' not found."
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return f"Content of {filename}:\n{content}"
    except Exception as e:
        return f"Could not read file (might not be text): {str(e)}"

@tool
def get_current_time_tool() -> str:
    """Get the current local time."""
    return str(datetime.datetime.now())
