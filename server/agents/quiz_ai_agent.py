# agents/quiz_ai_agent.py

from services.azure_open_ai import get_azure_openai_llm
from services.azure_mongodb import MongoDBClient
from models.quiz import Quiz, Question
from bson import ObjectId
import datetime

def generate_questions(user_id, topic, num_questions=5):
    """
    Generates questions based on a given topic and stores them in the database.

    Args:
        user_id (str): The ID of the user requesting the quiz.
        topic (str): The topic for which to generate questions.
        num_questions (int): The number of questions to generate.

    Returns:
        dict: A dictionary containing the quiz ID and the questions without correct answers.
    """
    questions = []
    llm = get_azure_openai_llm()  # Get the Azure language model

    # Example prompt structure for generating questions
    prompt = (
        f"Generate {num_questions} questions about {topic} either along with four answer choices, or one short answer. "
        f"Split each question-answer pair on a separate line. "
        f"Split the question and the options each by the text [&&]. "
        f"Also mention whether it's multiple choice (MC) or short answer (SA). "
        f"Ex: MC[&&]Question?[&&]Answer1[&&]Answer2[&&]Answer3[&&]Answer4, new line, then question 2. "
        f"For SA, ex: SA[%%]Question?[&&]Answer"
    )

    try:
        response = llm(prompt)  # Call the Azure LLM with the prompt
        generated_text = response.content.strip()  # Get the text response from the LLM

        # Process the generated text to extract questions
        for line in generated_text.splitlines():
            if not line.strip():
                continue  # Skip empty lines

            if line.startswith("MC[&&]"):  # Handle multiple-choice questions
                parts = line[6:].split("[&&]")
                question = parts[0].strip()
                options = [opt.strip() for opt in parts[1:5]]  # Four options
                correct_answer = options[0]  # Placeholder for correct answer (you can modify this logic)
                question_id = str(ObjectId())
                questions.append(Question(
                    question_id=question_id,
                    question=question,
                    options=options,
                    correct_answer=correct_answer,
                    question_type='MC'
                ))
            elif line.startswith("SA[%%]"):  # Handle short-answer questions
                parts = line[6:].split("[&&]")
                question = parts[0].strip()
                correct_answer = parts[1].strip() if len(parts) > 1 else ""  # Second part is the answer
                question_id = str(ObjectId())
                questions.append(Question(
                    question_id=question_id,
                    question=question,
                    correct_answer=correct_answer,
                    question_type='SA'
                ))

        # Create a Quiz instance
        quiz = Quiz(
            user_id=user_id,
            topic=topic,
            questions=questions,
            created_at=datetime.datetime.utcnow().isoformat()
        )

        # Save the quiz to the database
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        quiz_dict = quiz.dict()
        result = db.quizzes.insert_one(quiz_dict)
        quiz_id = str(result.inserted_id)

        # Prepare questions without correct answers for the user
        user_questions = []
        for q in questions:
            q_dict = {
                "question_id": q.question_id,
                "question": q.question,
                "question_type": q.question_type
            }
            if q.question_type == 'MC':
                q_dict["options"] = q.options
            user_questions.append(q_dict)

        return {"quiz_id": quiz_id, "questions": user_questions}

    except Exception as e:
        print(f"Failed to generate questions: {e}")
        return {"error": str(e)}
