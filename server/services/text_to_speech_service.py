
"""
This module contains the text-to-speech service that uses the Azure Speech SDK to convert text to audio.
"""

"""Step 1: Import necessary modules"""
import azure.cognitiveservices.speech as speechsdk
import os
from dotenv import load_dotenv
import io

load_dotenv()

"""Step 2: Define the text-to-speech service"""
def text_to_speech(text_input, voice_name="en-US-AriaNeural", style=None):
    """
    Converts text to speech using Azure Speech SDK with specified voice and style.

    Args:
        text_input (str): The text to be converted to speech.
        voice_name (str): The name of the voice to use.
        style (str, optional): The speaking style (e.g., 'calm', 'cheerful').

    Returns:
        bytes: The synthesized audio data in WAV format, or None if synthesis failed.
    """
    try:
        # Set up the speech config with your subscription details
        speech_key = os.environ.get("SPEECH_AI_KEY")
        service_region = os.environ.get("SERVICE_REGION")
        if not speech_key or not service_region:
            print("Missing SPEECH_AI_KEY or SERVICE_REGION in environment variables.")
            return None
        
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)


        # Create a speech synthesizer using the in-memory stream
        #audio_stream = speechsdk.audio.AudioOutputConfig(use_default_speaker=False)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

       # Construct SSML if a style is specified
        if style:
            ssml = f"""
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
                xmlns:mstts="https://www.w3.org/2001/mstts" 
                xml:lang="{voice_name.split('-')[0]}">
                <voice name="{voice_name}">
                    <mstts:express-as style="{style}">
                        {text_input}
                    </mstts:express-as>
                </voice>
            </speak>
            """
            result = synthesizer.speak_ssml_async(ssml).get()
        else:
            # Use plain text synthesis
            result = synthesizer.speak_text_async(text_input).get()

        # Check the result
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print("Speech synthesized successfully.")
            # Access the audio data directly
            audio_data = result.audio_data
            if audio_data:
                print(f"Audio data length: {len(audio_data)} bytes")
                return audio_data
            else:
                print("No audio data found in the result.")
                return None
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