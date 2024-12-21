from pydantic import BaseModel
from typing import Optional

class Feedback(BaseModel):
    question_id: str
    correct: bool
    correct_answer: Optional[str] = None
    user_answer: Optional[str] = None
    feedback: Optional[str] = None