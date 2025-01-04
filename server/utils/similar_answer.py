from rapidfuzz import fuzz

def is_similar(user_answer, correct_answer, threshold=80):
    """
    Determines if the user_answer is similar to the correct_answer based on the threshold.

    Args:
        user_answer (str): The answer provided by the user.
        correct_answer (str): The correct answer.
        threshold (int): The similarity threshold percentage.

    Returns:
        bool: True if similarity is above the threshold, False otherwise.
    """
    similarity = fuzz.token_sort_ratio(user_answer.lower(), correct_answer.lower())
    return similarity >= threshold