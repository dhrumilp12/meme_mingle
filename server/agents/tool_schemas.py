"""This module defines the input schemas for the tools in the tool agent."""

"""Step 1: Import necessary modules"""
from pydantic import BaseModel

"""Step 2: Define the input schemas"""
# Define the input schema for the GenerateDocument tool
class GenerateDocumentInput(BaseModel):
    content: str
    format: str = 'pdf'

# Define the input schema for the UserProfileRetrieval tool
class UserProfileRetrievalInput(BaseModel):
    user_id: str

# Define the input schema for the WebSearchYouTube tool
class WebSearchYouTubeInput(BaseModel):
    query: str

# Define the input schema for the GenerateSuggestions tool
class GenerateSuggestionsInput(BaseModel):
    mood: str
    user_input: str

# Define the input schema for the WebSearchGoogle tool
class WebSearchBingInput(BaseModel):
    query: str

# Define the input schema for the TextbookSearch tool    
class TextbookSearchInput(BaseModel):
    query: str

# Define the input schema for the UserJourneyRetrieval tool
class UserJourneyRetrievalInput(BaseModel):
    user_id: str

# Define the input schema for the AgentFacts tool
class AgentFactsInput(BaseModel):
    query: str

# Define the input schema for the JobSearch tool
class JobSearchInput(BaseModel):
    skills: str
    location: str = None

# Define the input schema for the FetchMeme tool
class FetchMemeInput(BaseModel):
    topic: str  # The topic to fetch memes about

