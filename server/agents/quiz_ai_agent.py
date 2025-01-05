# agents/quiz_ai_agent.py

from services.azure_open_ai import get_azure_openai_llm
from services.azure_mongodb import MongoDBClient
from models.quiz import Quiz, Question
from bson import ObjectId
import datetime
from services.azure_form_recognizer import extract_text_from_file
from utils.consts import language_mapping
def generate_questions(user_id, topic=None, file_content=None, file_mime_type=None, num_questions=5, level='medium', language='en'):
    """
    Generates questions based on a given topic and stores them in the database.

    Args:
        user_id (str): The ID of the user requesting the quiz.
        topic (str): The topic for which to generate questions.
        num_questions (int): The number of questions to generate.
        level (str): Difficulty level of the questions.
        language (str): Language code (e.g., 'en' for English, 'gu' for Gujarati).
    
    Returns:
        dict: A dictionary containing the quiz ID and the questions without correct answers.
    """
    
    language_name = language_mapping.get(language, 'English')  # Default to English if code not found
    # Validate the level
    valid_levels = ['easy', 'medium', 'hard']
    if level.lower() not in valid_levels:
        return {"error": f"Invalid level '{level}'. Valid options are: {', '.join(valid_levels)}."}
    
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
        base_prompt += f"Generate {num_questions} {level.lower()} level questions about {topic} in {language_name}. "
    else:
        base_prompt += f"Generate {num_questions} {level.lower()} level questions in {language_name}. "

    if not topic and not file_content:
        return {"error": "Either a topic or a file must be provided to generate questions."}

    # Example prompt structure for generating questions
    prompt = (
        f"{base_prompt}"
        f"Each question should be either multiple-choice (MC) with four answer choices or a short answer (SA). "
        f"For MC questions, **exactly one** answer choice must be marked as correct by appending an asterisk (*) immediately after the answer text, without any spaces. "
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
                options = []
                correct_answer = None
                for opt in parts[1:5]:  # Four options
                    opt = opt.strip()
                    if opt.endswith('*'):
                        opt = opt[:-1].strip()  # Remove the asterisk
                        correct_answer = opt
                    options.append(opt)
                
                if not correct_answer:
                    # Fallback if no correct answer is marked
                    correct_answer = options[0]  # Or handle as an error
                    
                
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
            level=level.lower(),
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

