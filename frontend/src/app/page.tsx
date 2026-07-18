"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "bot";
  content: string;
};

const translations: Record<string, any> = {
  en: {
    dashboard: "Dashboard",
    calendar: "Calendar",
    files: "Files",
    settings: "Settings",
    overview: "Overview",
    systemOnline: "System Online",
    typeMessage: "Type your message...",
    apiConnections: "API Connections",
    preferences: "Preferences",
    theme: "Theme",
    language: "Language",
    saveSettings: "Save Settings",
    saving: "Saving...",
    connected: "Connected",
    disconnected: "Disconnected"
  },
  hi: {
    dashboard: "डैशबोर्ड",
    calendar: "कैलेंडर",
    files: "फ़ाइलें",
    settings: "सेटिंग्स",
    overview: "अवलोकन",
    systemOnline: "सिस्टम ऑनलाइन",
    typeMessage: "अपना संदेश टाइप करें...",
    apiConnections: "एपीआई कनेक्शन",
    preferences: "प्राथमिकताएं",
    theme: "थीम",
    language: "भाषा",
    saveSettings: "सेटिंग्स सहेजें",
    saving: "सहेजा जा रहा है...",
    connected: "जुड़ा हुआ",
    disconnected: "डिस्कनेक्ट"
  }
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Data states for tabs
  const [remindersData, setRemindersData] = useState<any[]>([]);
  const [filesData, setFilesData] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>({});
  
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showWeatherKey, setShowWeatherKey] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const t = translations[settingsData.language || 'en'] || translations.en;
  
  useEffect(() => {
    if (settingsData.theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [settingsData.theme]);
  
  // Voice Recognition setup
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groq_key: settingsData.groq_key || '',
          weather_key: settingsData.weather_key || '',
          theme: settingsData.theme || 'dark',
          language: settingsData.language || 'en'
        })
      });
      if (response.ok) {
        setSettingsData((prev: any) => ({
          ...prev,
          groq_connected: !!settingsData.groq_key,
          weather_connected: !!settingsData.weather_key
        }));
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Fetch tab data when activeTab changes
  useEffect(() => {
    if (activeTab === 'calendar') {
      fetch(`${API_URL}/api/reminders`)
        .then(res => res.json())
        .then(data => setRemindersData(data))
        .catch(console.error);
    } else if (activeTab === 'files') {
      fetch(`${API_URL}/api/files`)
        .then(res => res.json())
        .then(data => setFilesData(data))
        .catch(console.error);
    } else if (activeTab === 'settings') {
      fetch(`${API_URL}/api/settings`)
        .then(res => res.json())
        .then(data => setSettingsData(data))
        .catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Load initial chat history
    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/chat/history?thread_id=dashboard_user`);
        if (response.ok) {
          const history = await response.json();
          if (history.length > 0) {
            setMessages(history);
          } else {
            setMessages([{ role: "bot", content: "Hello! I am your AI Personal Assistant. How can I help you today?" }]);
          }
        }
      } catch (e) {
        console.error("Failed to load history", e);
        setMessages([{ role: "bot", content: "Hello! I am your AI Personal Assistant. How can I help you today?" }]);
      }
    };
    loadHistory();

    // Initialize Web Speech API
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Automatically tell the agent about it
        handleSend(`I just uploaded a file named ${data.filename}. Please read it and summarize it for me.`);
      } else {
        alert("Failed to upload file");
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, thread_id: "dashboard_user" }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", content: data.response }]);
      
      // Optional TTS
      // speakText(data.response);
      
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "bot", content: "Sorry, I'm having trouble connecting to the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="glass-panel sidebar">
        <div className="brand">
          <div className="brand-icon">✨</div>
          AI Agent
        </div>
        <nav className="nav-links">
          <a className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {t.dashboard}
          </a>
          <a className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            {t.calendar}
          </a>
          <a className={`nav-item ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            {t.files}
          </a>
          <a className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            {t.settings}
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="glass-panel top-bar">
          <h2>{t.overview}</h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>🟢 {t.systemOnline}</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              PA
            </div>
          </div>
        </header>

        <div className="content-grid">
          {activeTab === 'dashboard' ? (
            <>
              {/* Chat Interface */}
              <section className="glass-panel chat-section">
                <div className="chat-messages">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message bot" style={{ opacity: 0.7 }}>
                      Thinking...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="chat-input-area">
                  <button 
                    className={`btn-icon ${isRecording ? 'active' : ''}`}
                    onClick={toggleRecording}
                    title="Voice Input"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  </button>
                  
                  <input 
                    type="text" 
                    className="chat-input"
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                  />
                  
                  <button 
                    className="btn-icon"
                    onClick={() => handleSend()}
                    disabled={isLoading}
                    style={{ background: "var(--primary-accent)", borderColor: "var(--primary-accent)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </section>

              {/* Widgets Area */}
              <aside className="widgets-section">
                <div className="glass-panel widget">
                  <h3>🌤️ Weather</h3>
                  <div className="widget-content">
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>75°F</div>
                    <div style={{ color: "var(--text-muted)" }}>Sunny, San Francisco</div>
                  </div>
                </div>

                <div className="glass-panel widget">
                  <h3>📅 Upcoming</h3>
                  <div className="widget-content" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ padding: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                      <strong>Team Sync</strong><br/>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>2:00 PM - 3:00 PM</span>
                    </div>
                    <div style={{ padding: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                      <strong>Review PRs</strong><br/>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>4:30 PM - 5:00 PM</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel widget">
                  <h3>📂 Recent Files</h3>
                  <div className="widget-content">
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <li>📄 project_brief.pdf</li>
                      <li>📊 Q3_financials.xlsx</li>
                      <li>🖼️ design_mockup.png</li>
                    </ul>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: "none" }} 
                      onChange={handleFileUpload} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", width: "100%", opacity: isUploading ? 0.5 : 1 }}
                    >
                      {isUploading ? "Uploading..." : "Upload New File"}
                    </button>
                  </div>
                </div>
              </aside>
            </>
          ) : activeTab === 'calendar' ? (
            <section className="glass-panel" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
              <h2 style={{ marginBottom: "2rem" }}>📅 Your Reminders</h2>
              {remindersData.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No reminders found. Ask the AI to set one for you!</p>
              ) : (
                <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                  {remindersData.map((reminder) => (
                    <div key={reminder.id} style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                      <h3 style={{ marginBottom: "0.5rem" }}>{reminder.task}</h3>
                      <p style={{ color: "var(--primary-accent)", fontWeight: "bold" }}>⏰ {reminder.time}</p>
                      <small style={{ color: "var(--text-muted)", display: "block", marginTop: "1rem" }}>Created: {new Date(reminder.created_at).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : activeTab === 'files' ? (
            <section className="glass-panel" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h2>📂 Uploaded Files</h2>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ padding: "0.75rem 1.5rem", background: "var(--primary-accent)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "bold" }}
                >
                  {isUploading ? "Uploading..." : "Upload New File"}
                </button>
              </div>
              {filesData.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No files uploaded yet.</p>
              ) : (
                <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {filesData.map((file, idx) => (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "12px", textAlign: "center", border: "1px solid var(--glass-border)" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
                      <p style={{ wordBreak: "break-all", fontWeight: "bold", marginBottom: "0.5rem" }}>{file.name}</p>
                      <small style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(2)} KB</small>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : activeTab === 'settings' ? (
            <section className="glass-panel" style={{ gridColumn: "1 / -1", padding: "2rem", width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>⚙️ {t.settings}</h2>
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  style={{ padding: "0.75rem 1.5rem", background: "var(--primary-accent)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "bold", opacity: isSavingSettings ? 0.7 : 1 }}
                >
                  {isSavingSettings ? t.saving : t.saveSettings}
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <h3 style={{ marginBottom: "1.5rem" }}>{t.apiConnections}</h3>
                  
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong>Groq AI Brain</strong>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem", background: settingsData.groq_connected ? "rgba(46, 213, 115, 0.2)" : "rgba(255, 71, 87, 0.2)", color: settingsData.groq_connected ? "#2ed573" : "#ff4757" }}>
                        {settingsData.groq_connected ? t.connected : t.disconnected}
                      </span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input 
                        type={showGroqKey ? "text" : "password"} 
                        placeholder="Enter Groq API Key"
                        value={settingsData.groq_key !== undefined ? settingsData.groq_key : (settingsData.groq_connected ? "************************" : "")}
                        onChange={(e) => setSettingsData({...settingsData, groq_key: e.target.value})}
                        style={{ width: "100%", padding: "0.75rem", paddingRight: "3rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "white" }}
                      />
                      <button 
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title={showGroqKey ? "Hide" : "Show"}
                      >
                        {showGroqKey ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    <small style={{ color: "var(--text-muted)", display: "block", marginTop: "0.5rem" }}>Update this key in backend/.env</small>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong>OpenWeatherMap</strong>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem", background: settingsData.weather_connected ? "rgba(46, 213, 115, 0.2)" : "rgba(255, 71, 87, 0.2)", color: settingsData.weather_connected ? "#2ed573" : "#ff4757" }}>
                        {settingsData.weather_connected ? t.connected : t.disconnected}
                      </span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input 
                        type={showWeatherKey ? "text" : "password"} 
                        placeholder="Enter OpenWeatherMap API Key"
                        value={settingsData.weather_key !== undefined ? settingsData.weather_key : (settingsData.weather_connected ? "************************" : "")}
                        onChange={(e) => setSettingsData({...settingsData, weather_key: e.target.value})}
                        style={{ width: "100%", padding: "0.75rem", paddingRight: "3rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "white" }}
                      />
                      <button 
                        onClick={() => setShowWeatherKey(!showWeatherKey)}
                        style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title={showWeatherKey ? "Hide" : "Show"}
                      >
                        {showWeatherKey ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    <small style={{ color: "var(--text-muted)", display: "block", marginTop: "0.5rem" }}>Update this key in backend/.env</small>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <h3 style={{ marginBottom: "1.5rem" }}>{t.preferences}</h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>{t.theme}</label>
                      <select 
                        value={settingsData.theme || 'dark'}
                        onChange={(e) => setSettingsData({...settingsData, theme: e.target.value})}
                        style={{ width: "100%", padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "white", cursor: "pointer" }}
                      >
                        <option value="dark">Dark Mode</option>
                        <option value="light">Light Mode</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>{t.language}</label>
                      <select 
                        value={settingsData.language || 'en'}
                        onChange={(e) => setSettingsData({...settingsData, language: e.target.value})}
                        style={{ width: "100%", padding: "0.75rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "white", cursor: "pointer" }}
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
