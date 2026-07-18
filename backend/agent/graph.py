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

# Initialize the Groq model
llm = ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY, temperature=0.5)
llm_with_tools = llm.bind_tools(tools)

def agent_node(state: AgentState):
    messages = state["messages"]
    system_prompt = SystemMessage(
        content=(
            "You are a helpful, professional AI Personal Assistant. "
            "You can use tools to search the web, check weather, set reminders, and read files. "
            "If you don't know the answer, use a tool to find out. "
            "Always be concise and polite."
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
