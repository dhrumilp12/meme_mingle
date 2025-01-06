import logging
from flask import jsonify, Blueprint, request
from agents.quiz_ai_agent import generate_questions
from models.quiz import Quiz
from models.user_response import UserResponse, Answer
from models.feedback import Feedback
from services.azure_mongodb import MongoDBClient
from bson import ObjectId
from utils.similar_answer import is_similar
import datetime
from services.azure_open_ai import get_azure_openai_llm
from services.azure_form_recognizer import ALLOWED_MIME_TYPES
import json
from services.db.user import get_user_profile_by_user_id
from utils.consts import language_mapping

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

quiz_ai_routes = Blueprint("quiz_ai", __name__)

@quiz_ai_routes.route('/ai/quiz/<user_id>', methods=['POST'])
def get_questions(user_id):
    """
    Endpoint to get generated questions based on a topic.
    """
    body = request.form.to_dict()
    if not body:
        return jsonify({"error": "No data provided"}), 400
    
    topic = body.get('topic')
    num_questions = int(body.get('num', 5))
    level = body.get('level', 'medium').lower()
    print('level:', level)
     # Validate level
    valid_levels = ['easy', 'medium', 'hard']
    if level not in valid_levels:
        return jsonify({"error": f"Invalid level '{level}'. Valid options are: {', '.join(valid_levels)}."}), 400

    # Handle the uploaded file
    uploaded_file = request.files.get('file')
    file_content = None
    file_mime_type = None

    if uploaded_file:
        file_content = uploaded_file.read()
        file_mime_type = uploaded_file.mimetype

        # Validate MIME type
        if file_mime_type not in ALLOWED_MIME_TYPES:
            return jsonify({'error': f'Unsupported file type: {file_mime_type}'}), 400

        # Implement file size check
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
        if len(file_content) > MAX_FILE_SIZE:
            return jsonify({'error': 'File size exceeds the maximum limit of 10 MB'}), 400

    if not topic and not uploaded_file:
        return jsonify({"error": "At least one of 'topic' or 'file' must be provided."}), 400

    # Fetch user's preferred language
    user_profile_json = get_user_profile_by_user_id(user_id)
    if not user_profile_json:
        return jsonify({"error": "User profile not found."}), 404
    
    user_profile = json.loads(user_profile_json)
    preferred_language = user_profile.get('preferredLanguage', 'en')  # Default to English

    result = generate_questions(
        user_id, 
        topic, 
        file_content, 
        file_mime_type, 
        num_questions, 
        level,
        language=preferred_language
    )

    if "error" in result:
        return jsonify({"error": result["error"]}), 500

    return jsonify(result)

@quiz_ai_routes.route('/ai/quiz/<quiz_id>/submit', methods=['POST'])
def submit_answers(quiz_id):
    """
    Endpoint to submit answers for a quiz and receive a score along with feedback.
    """
    data = request.get_json()
    user_id = data.get('user_id')
    answers = data.get('answers')  # List of answers with question_id and user_answer

    if not user_id or not answers:
        return jsonify({"error": "user_id and answers are required."}), 400

    # Fetch the quiz from the database
    db_client = MongoDBClient.get_client()
    db = db_client[MongoDBClient.get_db_name()]
    quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id), "user_id": user_id})

    if not quiz:
        return jsonify({"error": "Quiz not found."}), 404

    # Initialize scoring variables
    total_questions = len(quiz.get('questions', []))

    # Validate that all questions are answered
    if len(answers) != total_questions:
        return jsonify({"error": f"All {total_questions} questions must be answered."}), 400

    # Extract valid question_ids from the quiz
    valid_question_ids = set(q['question_id'] for q in quiz['questions'])

    # Validate all submitted question_ids
    for ans in answers:
        if ans['question_id'] not in valid_question_ids:
            return jsonify({"error": f"Invalid question_id: {ans['question_id']}" }), 400

    total_points = 0  # Initialize total points
    feedback_list = []
    llm = get_azure_openai_llm()  # Initialize LLM for generating feedback

    # Fetch user's preferred language
    user_profile_json = get_user_profile_by_user_id(user_id)
    if not user_profile_json:
        return jsonify({"error": "User profile not found."}), 404
    
    user_profile = json.loads(user_profile_json)
    preferred_language = user_profile.get('preferredLanguage', 'en')
    language_name = language_mapping.get(preferred_language, 'English')  # Default to English if code not found
    # Start a session for transaction
    with db_client.start_session() as session:
        try:
            with session.start_transaction():
                # Check if the user has already submitted this quiz
                existing_submission = db.user_responses.find_one(
                    {"user_id": user_id, "quiz_id": quiz_id},
                    session=session
                )

                is_first_submission = existing_submission is None

                # Process each answer
                for ans in answers:
                    question_id = ans.get('question_id')
                    user_answer = ans.get('user_answer').strip().lower()

                    # Find the corresponding question
                    question = next((q for q in quiz['questions'] if q['question_id'] == question_id), None)
                    if question:
                        correct_answer = question.get('correct_answer', '').strip().lower()
                        is_correct = False
                        points_awarded = 0  # To track points per question

                        if question.get('question_type') == 'MC':
                            # For MCQs, exact match of the option
                            if user_answer == correct_answer.lower():
                                is_correct = True
                                points_awarded = 10
                            else:
                                points_awarded = -5
                        elif question.get('question_type') == 'SA':
                            # New SA logic with similarity check
                            # Handle numerical answers separately
                            try:
                                user_num = float(user_answer)
                                correct_num = float(correct_answer)
                                if user_num == correct_num:
                                    is_correct = True
                                    points_awarded = 10
                                else:
                                    is_correct = False
                                    points_awarded = -5
                            except ValueError:
                                # Non-numeric answers: use similarity check
                                if is_similar(user_answer, correct_answer):
                                    is_correct = True
                                    points_awarded = 10
                                else:
                                    is_correct = False
                                    points_awarded = -5

                        # Calculate total points based on first submission
                        if is_first_submission:
                            total_points += points_awarded
                        else:
                            # Do not modify total_points for subsequent submissions
                            pass

                        # Generate feedback
                        if not is_correct:
                            # Prepare prompt for feedback generation
                            prompt = (
                                f"You are an educational assistant helping users (5-15 years old) understand their mistakes in quizzes.\n\n"
                                f"Question: {question['question']} ({language_name})\n"
                                f"User's Answer: {ans['user_answer']} ({language_name})\n"
                                f"Correct Answer: {question['correct_answer']} ({language_name})\n\n"
                                f"Provide constructive and detailed feedback in {language_name} that explains why the user's answer is incorrect and how to arrive at the correct answer. "
                                f"Ensure the feedback is clear, educational, and encourages the user to understand the concept better.\n\n"
                                f"Feedback:"
                            )

                            try:
                                feedback_response = llm(prompt)
                                feedback_text = feedback_response.content.strip()
                                logger.info(f"Generated feedback: {feedback_text}")
                            except Exception as e:
                                logger.error(f"Failed to generate feedback: {e}")
                                feedback_text = "No feedback available."

                            feedback_item = Feedback(
                                question_id=question_id,
                                correct=False,
                                correct_answer=question['correct_answer'],
                                user_answer=ans['user_answer'],
                                feedback=feedback_text
                            )
                        else:
                            feedback_item = Feedback(
                                question_id=question_id,
                                correct=True,
                                correct_answer=question['correct_answer'],
                                user_answer=ans['user_answer'],
                                feedback="Correct answer! Well done."
                            )

                        feedback_list.append(feedback_item)

                # Ensure that total_points does not go below zero
                if total_points < 0:
                    total_points = 0

                # Save the user response with feedback
                user_response = UserResponse(
                    quiz_id=quiz_id,
                    user_id=user_id,
                    answers=[Answer(**a) for a in answers],
                    score=total_points,
                    feedback=feedback_list,
                    graded_at=datetime.datetime.utcnow().isoformat()
                )

                user_response_dict = user_response.dict()
                result = db.user_responses.insert_one(user_response_dict, session=session)
                response_id = str(result.inserted_id)

                # Update the user's total_score only if it's the first submission
                if is_first_submission:
                    update_result = db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$inc": {"total_score": total_points}},
                        session=session
                    )

                    if update_result.modified_count != 1:
                        raise Exception("Failed to update total_score.")

                # Fetch the updated total_score
                user_doc = db.users.find_one({"_id": ObjectId(user_id)}, {"total_score": 1}, session=session)
                updated_total_score = user_doc.get('total_score', 0)

                return jsonify({
                    "response_id": response_id,
                    "score": total_points,
                    "total_possible_points": total_questions * 10,
                    "feedback": [f.dict() for f in feedback_list],
                    "total_score": updated_total_score  # Include the updated total_score
                })

        except Exception as e:
            logger.error(f"Transaction aborted due to: {e}")
            return jsonify({"error": "Failed to submit answers due to a server error."}), 500

@quiz_ai_routes.route('/ai/user/<user_id>/total_score', methods=['GET'])
def get_total_score(user_id):
    """
    Endpoint to retrieve the total score across all quizzes for a user.
    """
    db_client = MongoDBClient.get_client()
    db = db_client[MongoDBClient.get_db_name()]

    try:
        # Fetch the user's total_score directly from the User document
        user = db.users.find_one({"_id": ObjectId(user_id)}, {"total_score": 1})
        if not user:
            return jsonify({"error": "User not found."}), 404

        total_score = user.get('total_score', 0)

        return jsonify({"total_score": total_score}), 200

    except Exception as e:
        logger.error(f"Failed to retrieve total score: {e}")
        return jsonify({"error": "Failed to retrieve total score."}), 500
    


