"""
This model represents an object that keeps track of the user's 
overarching educational goals and corcerns.
"""

"""step 1: Import necessary modules"""
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

"""Step 2: Define the UserJourney model"""
# Define the TherapyPlan model
class EducationalPlan(BaseModel):
    chat_id: Optional[str] = None
    exercise: Optional[list[str]] = []
    submit_assignments: Optional[list[str]] = []
    assign_assignments: Optional[list[str]] = []
    assign_exercise: Optional[list[str]] = []
    share_resources: Optional[list[str]] = []

# Define the MentalHealthConcern model
class EducationalConcern(BaseModel):
    label: str
    severity: str

# Define the UserJourney model
class UserJourney(BaseModel):
    user_id: str
    patient_goals: Optional[list[str]] = []
    last_update: Optional[datetime] = None
    therapy_plan: Optional[EducationalPlan] = EducationalPlan()
    mental_health_concerns: Optional[list[EducationalConcern]] = []