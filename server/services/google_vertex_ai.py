"""Google Cloud Vertex AI services for language model and embeddings."""

"""Step 1: Import necessary modules"""
import os
from dotenv import load_dotenv
from langchain_google_vertexai import VertexAI
from langchain_community.embeddings import VertexAIEmbeddings
from utils.consts import CONTEXT_LENGTH_LIMIT
from google.cloud import aiplatform

"""Step 2: Define the Google Cloud Vertex AI services"""

# Define the function to get the Vertex AI variables
def get_vertex_ai_variables():
    load_dotenv()
    GCP_PROJECT = os.environ.get("GCP_PROJECT")
    GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")  # Default location
    GCP_SERVICE_ACCOUNT = os.environ.get("GCP_SERVICE_ACCOUNT")  # Path to service account key
    GCP_CHAT_MODEL = os.environ.get("GCP_CHAT_MODEL")  # e.g., "text-bison@001"
    GCP_EMBEDDING_MODEL = os.environ.get("GCP_EMBEDDING_MODEL")  # e.g., "textembedding-gecko@001"

    if not GCP_SERVICE_ACCOUNT:
        raise ValueError("GCP_SERVICE_ACCOUNT environment variable not set.")

    # Initialize the Vertex AI client
    aiplatform.init(
        project=GCP_PROJECT,
        location=GCP_LOCATION,
        credentials=os.path.abspath(GCP_SERVICE_ACCOUNT)
    )

    return GCP_PROJECT, GCP_LOCATION, GCP_CHAT_MODEL, GCP_EMBEDDING_MODEL

# Define the function to get the Vertex AI language model
def get_vertex_ai_llm():
    _, _, GCP_CHAT_MODEL, _ = get_vertex_ai_variables()

    llm = VertexAI(
        temperature=0.3,
        model=GCP_CHAT_MODEL,
        max_output_tokens=(CONTEXT_LENGTH_LIMIT // 2)
    )

    return llm

# Define the function to get the Vertex AI embeddings model
def get_vertex_ai_embeddings():
    _, _, _, GCP_EMBEDDING_MODEL = get_vertex_ai_variables()

    embedding_model = VertexAIEmbeddings(
        model=GCP_EMBEDDING_MODEL,
        chunk_size=10
    )

    return embedding_model
