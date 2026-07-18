from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    task = Column(String, index=True)
    time = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, index=True)
    role = Column(String) # "user" or "bot"
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
