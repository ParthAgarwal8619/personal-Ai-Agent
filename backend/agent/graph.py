from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
import operator
import os
from dotenv import load_dotenv

from .tools import web_search_tool, weather_tool, create_reminder_tool, read_file_tool, get_current_time_tool

load_dotenv()

# We need a Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "mock_key")

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]

# Define the tools our agent can use
tools = [web_search_tool, weather_tool, create_reminder_tool, read_file_tool, get_current_time_tool]
tool_node = ToolNode(tools)

# Initialize the Groq model (Upgraded to 70B for much smarter tool usage)
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0.2)
llm_with_tools = llm.bind_tools(tools)

def agent_node(state: AgentState):
    messages = state["messages"]
    system_prompt = SystemMessage(
        content=(
            "You are a highly intelligent AI Personal Assistant. "
            "You have access to tools to search Wikipedia (web_search_tool), check current weather (weather_tool), set reminders (create_reminder_tool), and read uploaded text/pdf files (read_file_tool). "
            "IMPORTANT RULES: "
            "1. ALWAYS use the weather_tool when asked about weather. Do NOT guess the weather. "
            "2. ALWAYS use the create_reminder_tool when asked to set a reminder or schedule something. "
            "3. If a user asks to summarize a file, use the read_file_tool to read it first. "
            "4. Be concise and helpful. Never refuse to help with innocent requests. "
            "5. LANGUAGE MATCHING: If the user asks a question in English, you MUST reply in pure English. If the user asks a question in Hindi or Hinglish, you MUST reply in friendly, conversational Hinglish (Hindi written in English alphabet). Match the user's language exactly."
        )
    )
    # Prefix messages with system prompt
    response = llm_with_tools.invoke([system_prompt] + list(messages))
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", tools_condition)
workflow.add_edge("tools", "agent")

# Compile the graph
graph = workflow.compile()
