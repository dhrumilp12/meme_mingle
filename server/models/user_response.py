from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId
from .feedback import Feedback

class Answer(BaseModel):
    question_id: str
    user_answer: str

class UserResponse(BaseModel):
    id: str = None
    quiz_id: str
    user_id: str
    answers: List[Answer]
    score: Optional[int] = None
    feedback: Optional[List[Feedback]] = None
    graded_at: Optional[str] = None  # ISO format timestamp

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }