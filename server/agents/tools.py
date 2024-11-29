"""This module contains the tools used by the agents to interact with the user and the environment."""

"""Step 1: Import necessary modules"""
from langchain_community.tools.tavily_search import TavilySearchResults
from services.db.user import get_user_profile_by_user_id
from services.db.user_journey import get_user_journey_by_user_id
from langchain.tools import Tool
from utils.agents import fetch_meme,get_job_listings,get_bing_search_results,get_gutendex_domain_textbooks, get_public_domain_textbooks, generate_suggestions, generate_document
from langchain_google_community import GooglePlacesTool
from .tool_schemas import (
    GenerateDocumentInput,
    UserProfileRetrievalInput,
    GenerateSuggestionsInput,
    TextbookSearchInput,
    WebSearchBingInput,
    AgentFactsInput,
    JobSearchInput,
    FetchMemeInput,
)



"""Step 2: Define the toolbox"""
toolbox = {
    "community": {
        "web_search_tavily": TavilySearchResults(),
        "location_search_gplaces": GooglePlacesTool(),
    },
    "custom": {
        "fetch_meme": {
            "func": fetch_meme,
            "description": "Fetches a popular meme related to a given topic using Giphy API.",
            "structured": True,
            "args_schema": FetchMemeInput,
        },
        "agent_facts": {
            "description": "Searches for specific facts about the AI's origin, creators, capabilities, and history.",
            "retriever": True,
            "structured": True,
            "args_schema": AgentFactsInput,
        },
        "web_search_bing": {
            "func": get_bing_search_results,
            "description": "Uses Bng Search to fetch search results for a given query.",
            "retriever": False,
            "structured": True,
            "args_schema": WebSearchBingInput
        },
        "generate_suggestions": {
            "func": generate_suggestions,
            "description": "Generates personalized activities or coping mechanisms based on the user's mood using a language model.",
            "structured": True,
            "args_schema": GenerateSuggestionsInput
            },
        
        "user_profile_retrieval": {
            "func": get_user_profile_by_user_id,
            "structured": True,
            "description": "Retrieves a user's profile information by the user's ID to be used when brought up in conversation. Includes age, name and location. Exclude if user ID is `0`, as this indicates it is an anonymous user.",
            "args_schema": UserProfileRetrievalInput
        },
        
        "textbook_search": {
            "func": get_public_domain_textbooks,
             "description": "Searches for textbooks in public domain or open-access libraries based on the user's query. Provides direct PDF links if available.",
            "structured": True,
            "args_schema": TextbookSearchInput
        },
         "gutendex_textbook_search": {
            "func": get_gutendex_domain_textbooks,
            "description": "Searches OpenStax for open-access textbooks based on the user's query. Provides direct PDF download links.",
            "structured": True,
            "args_schema": TextbookSearchInput
        },
        "generate_document": {
            "func": generate_document,
            "description": "Generates a document (PDF or DOCX) with the given content and returns a link to download it.",
            "structured": True,
            "args_schema": GenerateDocumentInput
        },
         "job_search": {
            "func": get_job_listings,
            "description": "Fetches current job listings that match the user's skills and optional location.",
            "structured": True,
            "args_schema": JobSearchInput,
        },
    }
}



"""extra agent tool"""


        #"user_journey_retrieval": {
           # "func": get_user_journey_by_user_id,
            #"structured": True,
            #"description": (
             #   "Retrieves the user's journey information, including mental health concerns, "
             #   "goals, and therapy plans, by the user's ID."
            #),
            #"args_schema": UserJourneyRetrievalInput

        #},
        #"web_search_google": {
         #   "func": get_google_search_results,
          #  "description": "Uses Google Custom Search to fetch search results for a given query.",
           # "retriever": False,
           # "structured": True,
           # "args_schema": WebSearchGoogleInput
        #},
        #"web_search_youtube": {
          #  "func": get_youtube_search_results,
          #  "description": "Uses YouTube Search to fetch search results for a given query.",
          #  "retriever": False,
           # "structured": True,
            #"args_schema": WebSearchYouTubeInput
       # },