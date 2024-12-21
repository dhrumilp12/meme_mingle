from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId

class Question(BaseModel):
    question_id: str
    question: str
    options: Optional[List[str]] = []
    correct_answer: Optional[str] = None
    question_type: str  # 'MC' or 'SA'

class Quiz(BaseModel):
    id: str = None
    user_id: str
    topic: str
    questions: List[Question]
    created_at: Optional[str] = None  # ISO format timestamp

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }