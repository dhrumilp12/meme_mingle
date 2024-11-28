"""This module contains a decorator that translates JSON responses to the user's preferred language."""
""" Step 1: Import required libraries """
from functools import wraps
from flask import request, jsonify
from services.translator import translate_text_cached
from models.user import User
from services.azure_mongodb import MongoDBClient
import logging

""" Step 2: Define the translate_response decorator """
def translate_response(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        
        # Only translate JSON responses
        if isinstance(response, tuple):
            data, status = response
        else:
            data = response
            status = 200

        if not isinstance(data, dict):
            return response  # Non-dict responses are not handled

        # Retrieve user ID from JWT token
        try:
            from flask_jwt_extended import get_jwt_identity
            user_id = get_jwt_identity()
        except:
            user_id = None

        if user_id:
            user = User.find_by_id(user_id)
            if user and user.preferredLanguage:
                target_language = user.preferredLanguage
                translated_data = {}
                for key, value in data.items():
                    if isinstance(value, str):
                        translated_text = translate_text_cached(value, target_language)
                        translated_data[key] = translated_text
                    else:
                        translated_data[key] = value
                return jsonify(translated_data), status

        return jsonify(data), status
    return wrapper