# google_vertex_ai.py
"""Google Cloud Vertex AI services for language model and embeddings."""

import os
from dotenv import load_dotenv
from langchain_google_vertexai import VertexAI, VertexAIEmbeddings
from utils.consts import CONTEXT_LENGTH_LIMIT
from google.cloud import aiplatform
from google.oauth2 import service_account
import logging
from typing import List
from langchain.tools import Tool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BindableVertexAI(VertexAI):
    tools: List[Tool] = []  # Define 'tools' as a field with a default empty list

    def bind_tools(self, tools: List[Tool]):
        """
        Bind tools to the LLM for tool calling.

        Args:
            tools (List[Tool]): A list of tools to bind.
        """
        self.tools = tools  # Now, 'tools' is a recognized field

def get_vertex_ai_variables():
    """Load environment variables and initialize Vertex AI client."""
    load_dotenv()

    # Fetch environment variables
    GCP_PROJECT = os.environ.get("GCP_PROJECT")
    GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")  # Default location
    GCP_SERVICE_ACCOUNT = os.environ.get("GCP_SERVICE_ACCOUNT")  # Path to service account key
    GCP_CHAT_MODEL = os.environ.get("GCP_CHAT_MODEL")  # e.g., "text-bison@001"
    GCP_EMBEDDING_MODEL = os.environ.get("GCP_EMBEDDING_MODEL")  # e.g., "textembedding-gecko@001"
    print(GCP_PROJECT, GCP_LOCATION, GCP_SERVICE_ACCOUNT, GCP_CHAT_MODEL, GCP_EMBEDDING_MODEL)
    
    # Validate required environment variables
    missing_vars = []
    for var, name in [
        (GCP_PROJECT, "GCP_PROJECT"),
        (GCP_SERVICE_ACCOUNT, "GCP_SERVICE_ACCOUNT"),
        (GCP_CHAT_MODEL, "GCP_CHAT_MODEL"),
        (GCP_EMBEDDING_MODEL, "GCP_EMBEDDING_MODEL"),
    ]:
        if not var:
            missing_vars.append(name)

    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logger.error(error_msg)
        raise ValueError(error_msg)

    # Load credentials from the service account file
    try:
        credentials = service_account.Credentials.from_service_account_file(
            os.path.abspath(GCP_SERVICE_ACCOUNT)
        )
        logger.info("Service account credentials loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load service account credentials: {e}")
        raise RuntimeError(f"Failed to load service account credentials: {e}")

    # Initialize the Vertex AI client with proper credentials
    try:
        aiplatform.init(
            project=GCP_PROJECT,
            location=GCP_LOCATION,
            credentials=credentials  # Correctly pass the Credentials object
        )
        logger.info("Vertex AI client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Vertex AI client: {e}")
        raise RuntimeError(f"Failed to initialize Vertex AI client: {e}")

    return GCP_PROJECT, GCP_LOCATION, GCP_CHAT_MODEL, GCP_EMBEDDING_MODEL

def get_vertex_ai_llm():
    """Initialize and return the Bindable Vertex AI language model."""
    _, _, GCP_CHAT_MODEL, _ = get_vertex_ai_variables()

    try:
        llm = BindableVertexAI(
            temperature=0.3,
            model=GCP_CHAT_MODEL,
            max_output_tokens=(CONTEXT_LENGTH_LIMIT // 2)
        )
        logger.info("Bindable VertexAI language model initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Bindable VertexAI language model: {e}")
        raise RuntimeError(f"Failed to initialize Bindable VertexAI language model: {e}")

    return llm

def get_vertex_ai_embeddings():
    """Initialize and return the Vertex AI embeddings model."""
    _, _, _, GCP_EMBEDDING_MODEL = get_vertex_ai_variables()

    embedding_model = VertexAIEmbeddings(
        model=GCP_EMBEDDING_MODEL,
    )

    return embedding_model
