"""
This module contains the sentiment analysis and suggestion generation service using Google Cloud Natural Language API and Vertex AI.
"""

"""Step 1: Import necessary modules"""
import os
import logging
from typing import List
from dotenv import load_dotenv

# Google Cloud Libraries
from google.cloud import language_v1
from google.oauth2 import service_account


# Custom Modules (if any)
from .google_vertex_ai import get_vertex_ai_llm

load_dotenv()

"""Step 2: Initialize Google Cloud Natural Language Client"""
def get_natural_language_client():
    """
    Initializes and returns a Google Cloud Natural Language API client.
    
    Returns:
        language_v1.LanguageServiceClient: An authenticated Natural Language API client.
    """
    credentials_path = os.getenv("GOOGLE_CLOUD_NL_CREDENTIALS")
    if not credentials_path:
        raise ValueError("GOOGLE_CLOUD_NL_CREDENTIALS environment variable not set.")
    
    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    client = language_v1.LanguageServiceClient(credentials=credentials)
    return client


"""Step 3: Define the suggestion generation function"""
def generate_suggestions(mood: str, user_input: str) -> List[str]:
    """
    Generates personalized activities or coping mechanisms based on the user's mood and sentiment using a language model.
    
    Args:
        mood (str): The user's current mood.
        user_input (str): The user's input text to analyze sentiment.
    
    Returns:
        list: A list of suggested activities or coping mechanisms.
    """
    try:
        # Initialize clients
        nl_client = get_natural_language_client()
        llm = get_vertex_ai_llm()
        
        # Analyze sentiment
        sentiment = analyze_sentiment(nl_client, user_input)
        
        # Construct prompt for suggestion generation
        prompt = f"Suggest some personalized activities or coping mechanisms for someone who is feeling {mood} and has a sentiment of {sentiment}."
        
        # Generate suggestions using the language model
        suggestions_text = llm(prompt)
        
        # Split the suggestions into a list (assuming suggestions are separated by newlines or bullets)
        suggestions = parse_suggestions(suggestions_text)
        
        return suggestions
    
    except Exception as e:
        logging.error(f"Error generating suggestions: {e}")
        return []

"""Step 4: Define sentiment analysis function"""
def analyze_sentiment(client: language_v1.LanguageServiceClient, text: str) -> str:
    """
    Analyzes the sentiment of the provided text using Google Cloud Natural Language API.
    
    Args:
        client (language_v1.LanguageServiceClient): The Natural Language API client.
        text (str): The text to analyze.
    
    Returns:
        str: The sentiment of the text ('POSITIVE', 'NEGATIVE', 'NEUTRAL', or 'MIXED').
    """
    document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)
    
    response = client.analyze_sentiment(request={'document': document})
    sentiment = response.document_sentiment
    
    # Determine sentiment label based on score and magnitude
    if sentiment.score >= 0.25:
        return "POSITIVE"
    elif sentiment.score <= -0.25:
        return "NEGATIVE"
    else:
        return "NEUTRAL"

"""Step 5: Define a function to parse suggestions from LLM output"""
def parse_suggestions(suggestions_text: str) -> List[str]:
    """
    Parses the suggestions text into a list of suggestions.
    
    Args:
        suggestions_text (str): The raw text output from the language model.
    
    Returns:
        list: A list of individual suggestions.
    """
    # Example parsing logic (can be customized based on LLM output format)
    suggestions = []
    
    # Split by newline or bullet points
    lines = suggestions_text.strip().split('\n')
    for line in lines:
        # Remove common bullet characters
        clean_line = line.lstrip('-*• ').strip()
        if clean_line:
            suggestions.append(clean_line)
    
    return suggestions

