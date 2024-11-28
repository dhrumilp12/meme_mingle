"""
This module contains the speech recognition service that uses the Google Cloud Speech-to-Text API to convert audio to text.
"""

"""Step 1: Import necessary modules"""
import os
import logging
from google.cloud import speech_v1p1beta1 as speech  # Using the beta version for enhanced features
import io
import subprocess
from dotenv import load_dotenv

load_dotenv()

"""Step 2: Define the speech recognition service"""

# Define a function to check if FFmpeg is installed
def check_ffmpeg():
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        print("FFmpeg version:")
        print(result.stdout)
    except Exception as e:
        print("Failed to run FFmpeg:", str(e))
        raise EnvironmentError("FFmpeg is not installed or not found in PATH.")

check_ffmpeg()

# Define a function to convert audio to WAV format
def convert_audio_to_wav(input_audio_path, output_audio_path):
    try:
        command = [
            'ffmpeg',
            '-i', input_audio_path,
            '-acodec', 'pcm_s16le',
            '-ac', '1',
            '-ar', '16000',
            output_audio_path
        ]
        result = subprocess.run(command, check=True, text=True, capture_output=True)
        print(f"FFmpeg output: {result.stdout}")
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}")
        raise Exception("Failed to convert audio") from e

# Define the speech recognition function
def speech_to_text(audio_file):
    """
    Converts an audio file to text using Google Cloud Speech-to-Text API.

    Args:
        audio_file: A file-like object containing the audio data.

    Returns:
        str: The transcribed text.
    """
    # Define temporary file paths
    temp_input_path = 'temp_input.webm'
    temp_output_path = 'temp_output.wav'

    try:
        # Save original audio to a temporary file
        with open(temp_input_path, 'wb') as f:
            f.write(audio_file.read())

        # Convert to WAV format
        convert_audio_to_wav(temp_input_path, temp_output_path)

        # Load converted audio
        with open(temp_output_path, 'rb') as f:
            audio_data = f.read()

        # Convert the audio file received into a stream
        audio_stream = io.BytesIO(audio_data)

        print(f"Size of audio file: {audio_stream.getbuffer().nbytes} bytes")  # Debugging the size of the file
        audio_stream.seek(0)
        print(f"Size of audio file after seek: {audio_stream.getbuffer().nbytes} bytes")

        # Set up the Speech-to-Text client with your service account
        credentials_path = os.getenv("GOOGLE_CLOUD_SPEECH_CREDENTIALS")
        if not credentials_path:
            raise ValueError("GOOGLE_CLOUD_SPEECH_CREDENTIALS environment variable not set.")

        client = speech.SpeechClient.from_service_account_file(credentials_path)

        # Configure audio settings
        audio = speech.RecognitionAudio(content=audio_data)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_automatic_punctuation=True
        )

        # Perform speech recognition
        response = client.recognize(config=config, audio=audio)

        # Process the response
        if not response.results:
            print("No speech could be recognized")
            return "No speech could be recognized"

        # Concatenate the results
        recognized_text = ""
        for result in response.results:
            recognized_text += result.alternatives[0].transcript + " "

        print("Recognized:", recognized_text.strip())
        return recognized_text.strip()

    except Exception as e:
        print(f"Error during speech recognition: {str(e)}")
        return None
    finally:
        # Clean up temporary files
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
        print("Temporary files removed")
