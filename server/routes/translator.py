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
    api_key = os.getenv('AZURE_TRANSLATOR_KEY')
    endpoint = os.getenv('AZURE_TRANSLATOR_ENDPOINT')
    region = os.getenv('AZURE_TRANSLATOR_REGION')

    if not texts or not target_language:
        return jsonify({'error': 'Missing texts or target_language'}), 400

    if not api_key or not endpoint:
        logging.error("API key or endpoint not found. Please set the AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_ENDPOINT environment variables.")
        return jsonify({'error': 'Server configuration error'}), 500

    path = '/translate?api-version=3.0'
    constructed_url = endpoint + path

    headers = {
        'Ocp-Apim-Subscription-Key': api_key,
        'Content-type': 'application/json',
        'Ocp-Apim-Subscription-Region': region,  # e.g., 'eastus'
    }

    body = [{'text': text} for text in texts]

    params = {
        'to': target_language
    }

    try:
        response = requests.post(constructed_url, params=params, headers=headers, json=body)
        response.raise_for_status()
        response_data = response.json()
        translations = [item['translations'][0]['text'] for item in response_data]
        return jsonify({'translations': translations})
    except requests.exceptions.RequestException as e:
        logging.error(f"Translation API Error: {e}")
        return jsonify({'error': 'Translation API error'}), 500
