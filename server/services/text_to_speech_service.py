"""
This module contains the text-to-speech service that uses the Google Cloud Text-to-Speech API to convert text to audio.
"""

"""Step 1: Import necessary modules"""
import os
import logging
from google.cloud import texttospeech
from dotenv import load_dotenv
import io

load_dotenv()

"""Step 2: Define the text-to-speech service"""
def text_to_speech(text_input, voice_name="en-US-Standard-A", speaking_rate=1.0, pitch=0.0, audio_encoding="LINEAR16"):
    """
    Converts text to speech using Google Cloud Text-to-Speech API with specified voice parameters.

    Args:
        text_input (str): The text to be converted to speech.
        voice_name (str): The name of the voice to use. Default is "en-US-Standard-A".
        speaking_rate (float): Speaking rate/speed. Default is 1.0 (normal speed).
        pitch (float): Pitch adjustment. Default is 0.0 (default pitch).
        audio_encoding (str): Audio encoding format. Options: "LINEAR16", "MP3", "OGG_OPUS". Default is "LINEAR16".

    Returns:
        bytes: The synthesized audio data in the specified format, or None if synthesis failed.
    """
    try:
        # Set up the Text-to-Speech client with your service account
        credentials_path = os.getenv("GOOGLE_CLOUD_TTS_CREDENTIALS")
        if not credentials_path:
            print("Missing GOOGLE_CLOUD_TTS_CREDENTIALS in environment variables.")
            return None

        client = texttospeech.TextToSpeechClient.from_service_account_file(credentials_path)

        # Set up the synthesis input
        synthesis_input = texttospeech.SynthesisInput(text=text_input)

        # Set up the voice parameters
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_name.split('-')[0],  # e.g., "en-US-Standard-A" -> "en"
            name=voice_name
        )

        # Set up the audio configuration
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding[audio_encoding],
            speaking_rate=speaking_rate,
            pitch=pitch
        )

        # Perform the text-to-speech request
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        # Check if audio content is present
        if response.audio_content:
            print("Speech synthesized successfully.")
            print(f"Audio content length: {len(response.audio_content)} bytes")
            return response.audio_content
        else:
            print("No audio content found in the response.")
            return None

    except Exception as e:
        print(f"Error during speech synthesis: {str(e)}")
        return None
