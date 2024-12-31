# agents/quiz_ai_agent.py

from services.azure_open_ai import get_azure_openai_llm
from services.azure_mongodb import MongoDBClient
from models.quiz import Quiz, Question
from bson import ObjectId
import datetime
from services.azure_form_recognizer import extract_text_from_file

def generate_questions(user_id, topic=None, file_content=None, file_mime_type=None, num_questions=5):
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

    # Prepare the base prompt
    base_prompt = ""

    if file_content:
        # Extract text from the file using Azure Form Recognizer
        extracted_text = extract_text_from_file(file_content, file_mime_type)
        if not extracted_text:
            return {"error": "Failed to extract text from the uploaded file."}
        base_prompt += f"Use the following content to generate quiz questions:\n\n{extracted_text}\n\n"

    if topic:
        base_prompt += f"Generate {num_questions} questions about {topic}. "

    if not topic and not file_content:
        return {"error": "Either a topic or a file must be provided to generate questions."}

    # Example prompt structure for generating questions
    prompt = (
        f"{base_prompt}"
        f"Each question should be either multiple-choice (MC) with four answer choices or a short answer (SA). "
        f"Format each question-answer pair on a separate line. "
        f"Separate the question and options using [&&]. "
        f"For MC, use the format: MC[&&]Question?[&&]Answer1[&&]Answer2[&&]Answer3[&&]Answer4. "
        f"For SA, use the format: SA[%%]Question?[&&]Answer."
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
            topic=topic if topic else "File-Based Quiz",
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

