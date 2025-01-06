
"""
This module contains the text-to-speech service that uses the Azure Speech SDK to convert text to audio.
"""

"""Step 1: Import necessary modules"""
import azure.cognitiveservices.speech as speechsdk
import os
from dotenv import load_dotenv
import io
import re
import emoji


load_dotenv()

"""Step 2: Define the text-to-speech service"""
def get_voice_name(preferred_language):
    """
    Returns the appropriate voice name based on the preferred language.
    """
    voice_mapping = {
        "en": "en-US-JennyNeural",        # English
        "es": "es-ES-ElviraNeural",      # Spanish
        "fr": "fr-FR-DeniseNeural",      # French
        "de": "de-DE-KatjaNeural",       # German
        "zh": "zh-CN-XiaoxiaoNeural",    # Chinese
        "ja": "ja-JP-NanamiNeural",      # Japanese
        "ko": "ko-KR-SunHiNeural",       # Korean
        "ru": "ru-RU-SvetlanaNeural",    # Russian
        "ar": "ar-SA-ZariyahNeural",     # Arabic
        "hi": "hi-IN-SwaraNeural",       # Hindi
        "pt": "pt-BR-FranciscaNeural",   # Portuguese
        "it": "it-IT-ElsaNeural",        # Italian
        "gu": "gu-IN-DhwaniNeural",      # Gujarati
        "bn": "bn-IN-TanishaaNeural",    # Bengali
        "te": "te-IN-ShrutiNeural",      # Telugu
        # Add more languages and their corresponding voices here
    }
    return voice_mapping.get(preferred_language, "en-US-JennyNeural")

def clean_text(text):
    """
    Cleans the input text by removing markdown, symbols, and sanitizing links.

    Args:
        text (str): The raw text input.

    Returns:
        str: The cleaned text.
    """
    # Remove markdown symbols
    text = re.sub(r'[#*_~`]', '', text)

    # Replace links with "link provided"
    text = re.sub(r'http[s]?://\S+', 'link provided', text)

    # Replace emojis with meaningful descriptions or remove them
    text = emoji.replace_emoji(text, replace="")

    # Replace specific symbols
    text = text.replace('&', 'and').replace('@', 'at')

    return text.strip()

def text_to_speech(text_input, preferred_language="en", style="calm"):
    """
    Converts cleaned text to speech using Azure Speech SDK with specified voice and style.

    Args:
        text_input (str): The text to be converted to speech.
        voice_name (str): The name of the voice to use.
        style (str, optional): The speaking style (e.g., 'calm', 'cheerful').

    Returns:
        bytes: The synthesized audio data in WAV format, or None if synthesis failed.
    """
    try:
        # Clean the text input
        cleaned_text = clean_text(text_input)

        # Set up the speech config with your subscription details
        speech_key = os.environ.get("SPEECH_AI_KEY")
        service_region = os.environ.get("SERVICE_REGION")
        if not speech_key or not service_region:
            print("Missing SPEECH_AI_KEY or SERVICE_REGION in environment variables.")
            return None
        
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)

        # Select voice based on preferred language
        voice_name = get_voice_name(preferred_language)

        # Construct SSML for enhanced speech synthesis
        if style:
            ssml = f"""
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
                xmlns:mstts="https://www.w3.org/2001/mstts" 
                xml:lang="{voice_name.split('-')[0]}">
                <voice name="{voice_name}">
                    <mstts:express-as style="{style}">
                        {cleaned_text}
                    </mstts:express-as>
                </voice>
            </speak>
            """
        else:
            ssml = f"""
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
                xmlns:mstts="https://www.w3.org/2001/mstts" 
                xml:lang="{voice_name.split('-')[0]}">
                <voice name="{voice_name}">
                    {cleaned_text}
                </voice>
            </speak>
            """

        # Create a speech synthesizer
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

        # Use SSML synthesis
        result = synthesizer.speak_ssml_async(ssml).get()

        # Check the result
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return result.audio_data
        else:
            print(f"Speech synthesis canceled: {result.reason}")
            if result.reason == speechsdk.ResultReason.Canceled:
                cancellation_details = result.cancellation_details
                print(f"Cancellation details: {cancellation_details.reason}")
                if cancellation_details.reason == speechsdk.CancellationReason.Error:
                    print(f"Error details: {cancellation_details.error_details}")
            return None

    except Exception as e:
        print(f"Error during speech synthesis: {str(e)}")
        return None