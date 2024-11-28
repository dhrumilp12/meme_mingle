"""
    This model captures details about the agent that the agent may be asked about,
    such as when it was built, or who built it.
"""

"""Step 1: Import necessary modules"""
from pydantic import BaseModel

"""Step 2: Define the AgentFact model"""
class AgentFact(BaseModel):
    sample_query: str
    fact: str