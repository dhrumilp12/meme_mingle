"""
This model represents a turn, that is, a single human-AI interaction.
"""

"""Step 1: Import necessary modules"""
from pydantic import BaseModel, Json

"""Step 2: Define the ChatTurn model"""
class ChatTurn(BaseModel):
    SessionId: str
    History: Json

