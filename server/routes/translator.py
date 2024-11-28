""" Translator route module. """
""" Step 1: Import required libraries """
import os
from flask import Blueprint, request, jsonify
import requests
import logging

""" Step 2: Create a Blueprint object """
translator_routes = Blueprint('translator', __name__)

""" Step 3: Define the routes """
@translator_routes.route('/translate', methods=['POST'])
def translate():
    data = request.get_json()
    texts = data.get('texts')
    target_language = data.get('target_language')
    api_key = os.getenv('GOOGLE_TRANSLATE_API_KEY')

    if not texts or not target_language:
        return jsonify({'error': 'Missing texts or target_language'}), 400

    if not api_key:
        logging.error("API key not found. Please set the GOOGLE_TRANSLATE_API_KEY environment variable.")
        return jsonify({'error': 'Server configuration error'}), 500

    # Pass the API key in the URL
    url = f'https://translation.googleapis.com/language/translate/v2?key={api_key}'
    params = {
        'q': texts,
        'target': target_language,
        'format': 'text'
    }

    response = requests.post(url, json=params)
    response_data = response.json()

    if response.status_code != 200 or 'error' in response_data:
        logging.error(f"Translation API Error: {response.text}")
        return jsonify({'error': 'Translation API error'}), response.status_code

    return jsonify(response_data)