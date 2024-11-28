"""This module provides a service for translating text using Google Cloud Translation API."""
""" Step 1: Import required libraries """
import os
from google.cloud import translate_v2 as translate
from dotenv import load_dotenv
import logging
from cachetools import TTLCache, cached

# Load environment variables
load_dotenv()

""" Step 2: Define the Translator class """

# Translator service class
class Translator:
    _client = None

    @staticmethod
    def get_client():
        if Translator._client is None:
            try:
                # Set the environment variable for authentication
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                Translator._client = translate.Client()
                logging.info("Google Translate client initialized.")
            except Exception as e:
                logging.error(f"Failed to initialize Google Translate client: {e}")
                raise e
        return Translator._client

    @staticmethod
    def translate_text(text, target_language):
        client = Translator.get_client()
        try:
            result = client.translate(text, target_language=target_language)
            return result['translatedText']
        except Exception as e:
            logging.error(f"Translation error: {e}")
            return text  # Fallback to original text if translation fails

# Initialize cache with a maximum of 1000 items and a TTL of 1 hour (3600 seconds)
cache = TTLCache(maxsize=1000, ttl=3600)

@cached(cache)
def translate_text_cached(text, target_language):
    """
    Translate text using the Translator service with caching.
    
    Args:
        text (str): The text to translate.
        target_language (str): The target language code (ISO 639-1).
        
    Returns:
        str: Translated text.
    """
    return Translator.translate_text(text, target_language)