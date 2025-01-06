
"""Step 1: Import necessary modules"""
# -- Standard libraries --
from datetime import datetime
import logging
import json
import asyncio
from operator import itemgetter
import os
# -- 3rd Party libraries --
# Azure
# Langchain
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain.memory.chat_memory import BaseChatMemory
from langchain.memory.summary import ConversationSummaryMemory
from langchain_core.runnables import RunnablePassthrough
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_mongodb.chat_message_histories import MongoDBChatMessageHistory
from langchain_core.messages import trim_messages
from langchain_core.messages.human import HumanMessage
from langchain_core.messages.system import SystemMessage

# MongoDB
# -- Custom modules --
from .ai_agent import AIAgent
from services.azure_mongodb import MongoDBClient
from services.azure_form_recognizer import extract_text_from_file
from services.text_to_speech_service import text_to_speech
from models.user import User
from services.db.user import get_user_profile_by_user_id
# Constants
from utils.consts import SYSTEM_MESSAGE
from pydub import AudioSegment
import base64
import subprocess




"""Step 2: Define the MentalHealthAIAgent class"""

class MemeMingleAIAgent(AIAgent):
    """
    A class that captures the data and methods required for
    mental health applications.
    It accesses to user profiles, user journeys,
    user entities, chat summaries, chat turns, resources, 
    and user resources.
    """


    """Step 3: Define the MentalHealthAIAgent class methods"""
    
    def __init__(self, system_message: str = SYSTEM_MESSAGE, tool_names: list[str] = [], desired_role: str = "MemeMingle"):
        """
        Initializes a MentalHealthAgent object.

        Args:
            system_message (str): The system message to be displayed at the beginning of the conversation.
            schema (list[str]): A list of object names that defines which custom tools the agent will use.

        Returns:
            None
        """
        self.desired_role = desired_role  # Store desired_role for later use
        # Format the system message with desired_role and AGENT_NAME
        formatted_system_message = system_message.format(role=desired_role)
        # Create a SystemMessage object
        self.system_message = SystemMessage(content=formatted_system_message)
        super().__init__(formatted_system_message, tool_names)

        # Define the base prompt messages without extracted_text
        self.base_prompt_messages = [
            ("system", self.system_message.content),
            ("system", "{past_summaries}"),
            ("system", "You can retrieve information about the AI using the 'agent_facts' tool."),
            ("system", "You can generate suggestions using the 'generate_suggestions' tool."),
            ("system", "You can search for information using the 'web_search_bing' tool."),
            ("system", "You can search for textbook PDFs using the 'textbook_search' tool."),
            ("system", "You can search for textbooks using the 'gutendex_textbook_search' tool."),
            #("system", "You can search for information using the 'web_search_youtube' tool."),
            ("system", "You can search for information using the 'web_search_tavily' tool."),
            ("system", "You can search for locations using the 'location_search_gplaces' tool."),
            ("system", "You can retrieve your user profile using the 'user_profile_retrieval' tool."),
            #("system", "You can retrieve your user journey using the 'user_journey_retrieval' tool."),
            ("system", "You can generate documents using the 'generate_document' tool."),
            ("system", "You can fetch popular memes using the 'fetch_meme' tool."),
            ("system", "user_id:{user_id}"),
            MessagesPlaceholder(variable_name="chat_turns"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]

        # Define the absolute path for the generated_audio directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, '../'))  # Adjust as per your project structure
        self.generated_audio_dir = os.path.join(project_root, 'generated_audio')
        
        # Ensure the directory exists
        os.makedirs(self.generated_audio_dir, exist_ok=True)
        self.agent_executor = None

    

    def get_session_history(self, session_id: str) -> MongoDBChatMessageHistory:
        """
        Retrieves the chat history for a given session ID from the database.

        Args:
            session_id (str): The session ID to retrieve the chat history for.
        """
        CONNECTION_STRING = MongoDBClient.get_mongodb_variables()

        history = MongoDBChatMessageHistory(
            CONNECTION_STRING,
            session_id,
            MongoDBClient.get_db_name(),
            collection_name="chat_turns"
        )

        logging.info(f"Retrieved chat history for session {history}")
        if history is None:
            return []
        else:
            return history

    def get_agent_memory(self, user_id:str, chat_id:int) -> BaseChatMemory:
            """
            Retrieves the agent's memory given the ID's for a specific user and chat instance.

            Args:
                user_id (str): The ID of the user.
                chat_id (int): The ID of the chat.

            Returns:
                BaseChatMemory: The agent's memory for the specified user and chat.
            """
            # chat_history = self.get_chat_history(user_id, chat_id)

            # memory = ConversationSummaryMemory.from_messages(
            #     llm=self.llm,
            #     chat_memory=chat_history,
            #     return_messages=True
            # )

            # TODO: Rewrite function or remove if not used anymore
            memory = None

            return memory

    def get_agent_with_history(self, agent_executor) -> RunnableWithMessageHistory:
        """
        Wraps the agent executor with a message history object to use history within the conversation.

        Args:
            agent_executor (AgentExecutor): The agent executor to wrap with message history.
        """

        agent_with_history = RunnableWithMessageHistory(
            agent_executor,
            get_session_history=self.get_session_history,
            input_messages_key="input",
            history_messages_key="chat_turns",
            verbose=True
        )

        return agent_with_history


    def get_agent_executor(self, prompt):
        """
        Retrieves an agent executor that runs the agent workflow.

        Args:
            prompt (ChatPromptTemplate): The LangChain prompt object to be passed to the executor.
        """
        tools = self.get_agent_tools()
        agent = create_tool_calling_agent(self.llm, tools, prompt)
        agent_executor = AgentExecutor(
            agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)

        return agent_executor
    
    def get_suggestions_based_on_mood(self, user_id, chat_id, user_input):
        mood = self.get_user_mood(user_id, chat_id)
        suggestions = self.tools["generate_suggestions"].func(mood, user_input)
        return suggestions

    def get_user_mood(self, user_id, chat_id):
        history:BaseChatMessageHistory = self.get_session_history(f"{user_id}-{chat_id}")
        history_log = asyncio.run(history.aget_messages()) # Running async function as synchronous

        # Get perceived mood
        instructions = """
        Given the messages provided, describe the user's mood in a single adjective. 
        Do your best to capture their intensity, attitude and disposition in that single word.
        Do not include anything in your response aside from that word.
        If you cannot complete this task, just answer \"None\".
        """

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", instructions),
                MessagesPlaceholder(variable_name="messages"),
            ]
        )

        trimmer = trim_messages(
            max_tokens=65,
            strategy="last",
            token_counter=self.llm,
            include_system=True,
            allow_partial=False,
            start_on="human",
        )

        trimmer.invoke(history_log)
        chain = RunnablePassthrough.assign(messages=itemgetter("messages") | trimmer) | prompt | self.llm
        response = chain.invoke({"messages": history_log})
        user_mood = None if response.content == "None" else response.content

        print("The user is feeling: ", user_mood)

        return user_mood


    
    
    @staticmethod
    def get_chat_id(user_id):
        db_client = MongoDBClient.get_client()
        db_name = MongoDBClient.get_db_name()
        db = db_client[db_name]

        chat_summary_collection = db["chat_summaries"]
    
        most_recent_chat_summary = chat_summary_collection.find_one(
            {"user_id": user_id}, 
            sort=[("chat_id", -1)]
        )

        return most_recent_chat_summary.get("chat_id")


    def run(self, message: str, file_content: bytes = None, file_mime_type: str = None, with_history:bool =True, user_id: str=None, chat_id:int=None, turn_id:int=None) -> str:
        """
        Runs the agent with the given message and context.

        Args:
            message (str): The message to be processed by the agent.
            file_content (bytes): The content of the uploaded file.
            with_history (bool): A flag indicating whether to use history in the conversation.
            user_id (str): A unique identifier for the user.
            chat_id (int): A unique identifier for the conversation.
            turn_id (int): A unique identifier for the evaluated turn in the conversation.
        """


        chat_id = MemeMingleAIAgent.get_chat_id(user_id)

       
        # TODO: throw error if user_id, chat_id is set to None.
        session_id = f"{user_id}-{chat_id}"
       
       # Retrieve past conversation summaries for the user
        db_client = MongoDBClient.get_client()
        db_name = MongoDBClient.get_db_name()
        db = db_client[db_name]
        chat_summary_collection = db["chat_summaries"]
        past_summaries_cursor = chat_summary_collection.find({"user_id": user_id}).sort("chat_id", -1)
        past_summaries = list(past_summaries_cursor)
        summaries_text = "\n".join([summary.get("summary_text", "") for summary in past_summaries])

       # Process the uploaded file if provided
        extracted_text = ""
        if file_content and file_mime_type:
            extracted_text = extract_text_from_file(file_content, file_mime_type)
            logging.info(f"Extracted text from file: {extracted_text[:500]}")

        # Prepare the input for the agent
        agent_input = {
            "input": message,
            "user_id": user_id,
            "past_summaries": summaries_text,
            "agent_scratchpad": [],
        }

        # Dynamically build the prompt messages
        prompt_messages = self.base_prompt_messages.copy()

        if extracted_text:
            # Include the extracted text in the prompt with clear instruction
            prompt_messages.insert(2, ("system", f"The user has provided a document with the following content:\n\n{extracted_text}\n\nPlease use this content to assist the user."))

        # Create a ChatPromptTemplate with the prompt messages
        prompt = ChatPromptTemplate.from_messages(prompt_messages)

        # Create the agent with the new prompt
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)
        agent_executor = AgentExecutor(
            agent=agent, tools=self.tools, verbose=True, handle_parsing_errors=True
        )
        self.agent_executor = self.get_agent_with_history(agent_executor)

        try:
            invocation = self.agent_executor.invoke(
                agent_input,
                config={"configurable": {"session_id": session_id}}
            )

            ai_text_response = invocation["output"]

            # Determine if it's the initial greeting
            is_initial = (turn_id == 0)

            # Fetch a relevant meme/GIF based on the AI's response or user input
            meme_topic = self.determine_meme_topic(ai_response=ai_text_response, is_initial=is_initial)

           
            # Use helper method to get fetch_meme tool
            fetch_meme_tool = self.get_tool_by_name("fetch_meme")
            if fetch_meme_tool:
                meme_url = fetch_meme_tool.func(meme_topic)
            else:
                logging.error("Tool 'fetch_meme' not found.")
                meme_url = None

            # Convert AI text response to speech
            audio_url, filename = self.convert_text_to_speech(ai_text_response, user_id, chat_id, turn_id)
            
             # 4) Determine Facial Expression & Animation
            fa_data = self.determine_facial_expression_and_animation(ai_text_response)
            facial_expression = fa_data["facial_expression"]
            animation = fa_data["animation"]
            ##convert wav to mp3 and do base64 encoding
            avatar_audio = self.convert_and_encode_audio(filename)

            ##lipsync data
            lip_sync_data = self.generate_lipsync_data(filename)
           


            
            # Structure the response to include both text and meme/GIF
            response = {
                "message": ai_text_response,
                "meme_url": meme_url,
                "audio_url": audio_url,
                "facial_expression": facial_expression,
                "animation": animation,
                "avatar_audio": avatar_audio,
                "lip_sync_data": lip_sync_data
            }   
            return response
        except Exception as e:
            logging.error(f"Error during agent execution: {e}", exc_info=True)
            raise   

   
    def convert_and_encode_audio(self, wav_file_name):
        """
        Converts a WAV file to MP3 and encodes it in Base64.
        
        Args:
            wav_file_name (str): The name of the WAV file to convert.
        
        Returns:
            str: Base64 encoded MP3 audio.
        """
        try:
            wav_file_path = os.path.join(self.generated_audio_dir, wav_file_name)
            
            if not os.path.isfile(wav_file_path):
                raise FileNotFoundError(f"The file {wav_file_path} does not exist.")
            
            # Define the MP3 file path
            mp3_file_path = os.path.splitext(wav_file_path)[0] + ".mp3"
            
            # Convert WAV to MP3
            audio = AudioSegment.from_wav(wav_file_path)
            audio.export(mp3_file_path, format="mp3")
            
            # Read the MP3 file and encode it as Base64
            with open(mp3_file_path, "rb") as mp3_file:
                encoded_audio = base64.b64encode(mp3_file.read()).decode("utf-8")
            
            return encoded_audio
        except Exception as e:
            logging.error(f"Error during audio conversion and encoding: {e}")
            return ""



    def generate_lipsync_data(self, wav_file_name):
        """
        Generates lip-sync data using Rhubarb and ensures a consistent return structure.
        
        Args:
            wav_file_name (str): The name of the WAV file to process.
        
        Returns:
            dict: Lip-sync data with "METADATA" and "MOUTH_CUES".
        """
        # Define the output JSON file path
        wav_file_path = os.path.join(self.generated_audio_dir, wav_file_name)
        json_file_path = os.path.splitext(wav_file_path)[0] + ".json"

        # Define Rhubarb path
        RHUBARB_PATH = os.getenv('RHUBARB_PATH')
        if not RHUBARB_PATH:
            # Fallback to a relative path if environment variable not set
            RHUBARB_PATH = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                '..', 'rhubarb', 'Rhubarb-Lip-Sync-1.13.0-Windows', 'rhubarb'
            )
            # On Windows, append .exe if necessary
            if os.name == 'nt' and not RHUBARB_PATH.endswith('.exe'):
                RHUBARB_PATH += '.exe'

        # Use Rhubarb to generate lip-sync data
        command = [
            RHUBARB_PATH,
            "-f", "json",
            "-o", json_file_path,
            wav_file_path,
            "-r", "phonetic"  # Faster but less accurate; remove for better accuracy
        ]

        try:
            # Check if WAV file exists
            if not os.path.isfile(wav_file_path):
                raise FileNotFoundError(f"The WAV file {wav_file_path} does not exist.")

            # Run the Rhubarb command
            subprocess.run(command, check=True)
            logging.info(f"Rhubarb successfully processed {wav_file_path}")

            # Read and return the lip-sync data from the JSON file
            if not os.path.isfile(json_file_path):
                raise FileNotFoundError(f"The JSON file {json_file_path} was not created by Rhubarb.")

            with open(json_file_path, "r") as json_file:
                lip_sync_data = json.load(json_file)

            # Validate the structure of lip_sync_data
            if "metadata" not in lip_sync_data or "mouthCues" not in lip_sync_data:
                logging.warning(f"Unexpected lip-sync data structure in {json_file_path}. Using default structure.")
                return {
                    "METADATA": {},
                    "MOUTH_CUES": {}
                }

            # Normalize keys to uppercase as per requirement
            normalized_data = {
                "METADATA": lip_sync_data.get("metadata", {}),
                "MOUTH_CUES": lip_sync_data.get("mouthCues", {})
            }

            return normalized_data

        except subprocess.CalledProcessError as e:
            logging.error(f"Rhubarb failed with error: {e}")
        except FileNotFoundError as e:
            logging.error(e)
        except json.JSONDecodeError as e:
            logging.error(f"JSON decoding failed for {json_file_path}: {e}")
        except Exception as e:
            logging.error(f"Unexpected error during lip-sync data generation: {e}")

        # Return default structure in case of any errors
        return {
            "METADATA": {},
            "MOUTH_CUES": {}
        }



    def determine_meme_topic(self, ai_response: str, is_initial: bool = False) -> str:
        """
        Determines the topic for fetching a meme/GIF based on the AI's response content.

        Args:
            ai_response (str): The AI's textual response.
            is_initial (bool): Flag indicating if it's the initial interaction.

        Returns:
            str: The topic to search for memes/GIFs.
        """

        if is_initial:
            prompt = (
                "Analyze the following AI response and determine the most appropriate welcoming meme topic from the list below:\n\n"
                "AI Response:\n"
                f"{ai_response}\n\n"
                "Available Meme Topics for Welcome:\n"
                "welcome, hello, introduction, greeting\n\n"
                "Based on the AI Response, select the most suitable meme topic:"
                "you must provide the meme topic."
            )
        else:
            # Define the prompt for the AI to determine the meme topic
            prompt = (
                "Analyze the following AI response and determine the most appropriate meme topic from the list below:\n\n"
                "AI Response:\n"
                f"{ai_response}\n\n"
                "Based on the AI Response, select the most suitable meme topic:"
                "you must provide the meme topic."
            )

        try:
            # Assuming self.llm is your language model instance
            response = self.llm.invoke(prompt)
            meme_topic = response.content.strip().lower() if hasattr(response, 'content') else str(response).strip().lower()
        except Exception as e:
            logging.error(f"AI-based topic determination failed: {e}")
            return "funny"  # Default topic

        return meme_topic 


        
        
    def get_initial_greeting(self, user_id:str) -> dict:
        """
        Retrieves the initial greeting message for a user.

        Args:
            user_id (str): The unique identifier for the user.
        """
        db_client = MongoDBClient.get_client()
        db_name = MongoDBClient.get_db_name()
        db = db_client[db_name]

        user_journey_collection = db["user_journeys"]
        chat_summary_collection = db["chat_summaries"]
        user_journey = user_journey_collection.find_one({"user_id": user_id})

         # Retrieve past conversation summaries for the user
        past_summaries_cursor = chat_summary_collection.find({"user_id": user_id}).sort("chat_id", -1)

        past_summaries = list(past_summaries_cursor)

        # Combine the past summaries into a single string
        recent_summaries = past_summaries[:2]
        summaries_text = "\n".join([summary.get("summary_text", "") for summary in recent_summaries])
        print(f"Past summaries retrieved:\n{summaries_text}")

        # Include the summaries in the system prompt
        system_message = self.system_message

        if summaries_text:
            addendum = f"""
        Previous Conversations Summary:
        {summaries_text}

        Please use the above information to continue assisting the user.
        """
            self.system_message.content += addendum


        now = datetime.now()
        chat_id = int(now.timestamp())

        chat_summary_collection.insert_one({
                "user_id": user_id,
                "chat_id": chat_id,
                "desired_role": self.desired_role,
                "perceived_mood": "",
                "summary_text": "",
                "concerns_progress": []
        })

        # Has user engaged with chatbot before?
        if user_journey is None:
            user_journey_collection.insert_one({
                "user_id": user_id,
                "patient_goals": [],
                "therapy_type": [],
                "last_updated": datetime.now().isoformat(),
                "therapy_plan": [],
                "mental_health_concerns": []
            })

            introduction = """
This is your first session with the student. Be polite and introduce yourself in a friendly and inviting manner.

In this session, do your best to understand what the user hopes to achieve through your service. Ask questions to uncover the user's academic goals, subjects of interest, and preferred learning methods (visual, auditory, kinesthetic) to derive an educational approach that fits their needs.

**Language Assurance:**
- Confirm the user's preferred language at the beginning of the session.
- Inform the user that you will respond **only** in their preferred language. If the preferred language is Gujarati (`"gu"`), ensure all communications are in Gujarati.
- If you encounter limitations in the preferred language, notify the user and offer to continue in English.

Explain that you are here to provide personalized tutoring, mentorship, and career guidance to support their educational journey. Ensure the student feels welcomed, understood, and excited to embark on their learning experience with your assistance.
"""

            full_system_message = ''.join([system_message.content, introduction])
            system_message.content = full_system_message

        chat_id = MemeMingleAIAgent.get_chat_id(user_id)

        response = self.run(
            message="",
            with_history=True,
            user_id=user_id,
            chat_id=chat_id,
            turn_id=0,
        )

       

        return {
            "message": response,
            "chat_id": chat_id
        }
        
        

    def get_summary_from_chat_history(self, user_id, chat_id):
        history: BaseChatMessageHistory = self.get_session_history(f"{user_id}-{chat_id}")

        memory = ConversationSummaryMemory(
            llm=self.llm,
            chat_memory=history,
            return_messages=False,
            input_key='input',
            output_key='output'
        )

        messages = asyncio.run(history.aget_messages())

        # Process messages in pairs (HumanMessage and AIMessage)
        for i in range(0, len(messages), 2):
            if i + 1 < len(messages):
                human_msg = messages[i]
                ai_msg = messages[i + 1]

                if isinstance(human_msg, HumanMessage) and not isinstance(ai_msg, HumanMessage):
                    memory.save_context({'input': human_msg.content}, {'output': ai_msg.content})
                else:
                    # Handle mismatched pairs if necessary
                    pass
            else:
                # Handle the case where there's an unmatched message at the end
                pass

        # Retrieve the summary
        summary = memory.load_memory_variables({}).get('history', '')
        print(f"Generated summary: {summary}")
        return summary



    def perform_final_processes(self, user_id, chat_id):
        db_client = MongoDBClient.get_client()
        db_name = MongoDBClient.get_db_name()
        db = db_client[db_name]

        chat_summary_collection = db["chat_summaries"]

        mood = self.get_user_mood(user_id, chat_id)
        summary = self.get_summary_from_chat_history(user_id, chat_id)

        # Update the chat summary
        result = chat_summary_collection.update_one(
            {"user_id": user_id, "chat_id": int(chat_id)}, 
            {"$set": {"perceived_mood": mood, "summary_text": summary}}
        )

        print(result)
        pass

    def get_tool_by_name(self, tool_name: str):
        """
        Retrieves a tool object by its name from the tools list.

        Args:
            tool_name (str): The name of the tool to retrieve.

        Returns:
            Tool: The tool object if found, else None.
        """
        for tool in self.tools:
            if tool.name == tool_name:
                return tool
        return None

    def convert_text_to_speech(self, text: str, user_id: str, chat_id: int, turn_id: int) -> tuple:
        """
        Converts the given text to speech and returns the URL of the audio file and the filename.
        
        Args:
            text (str): The text to convert to speech.
            user_id (str): The unique identifier for the user.
            chat_id (int): The unique identifier for the chat.
            turn_id (int): The turn number in the chat.
        
        Returns:
            tuple: (audio_url, filename)
        """
        try:
            # Fetch the user object
            user = User.find_by_id(user_id)
            
            if not user:
                print(f"User with ID {user_id} not found.")
                return None

            # Get the preferred language, default to 'en' if not set
            preferred_language = user.preferredLanguage or 'en'
            audio_data = text_to_speech(text, preferred_language=preferred_language)
            if not audio_data:
                raise ValueError("Text-to-speech conversion returned no audio data.")
            # Define a unique filename
            filename = f"{user_id}_{chat_id}_{turn_id}.wav"
            file_path = os.path.join(self.generated_audio_dir, filename)
            
            # Save the audio file
            with open(file_path, 'wb') as f:
                f.write(audio_data)
            
            backend_base_url = os.getenv('BACKEND_BASE_URL', 'http://localhost:8000')  # Ensure this environment variable is set
            audio_url = f"{backend_base_url}/ai_mentor/download_audio/{filename}"
            return audio_url, filename
        except Exception as e:
            logging.error(f"Text-to-speech conversion failed: {e}")
            return "", ""

        
    def determine_facial_expression_and_animation(self, ai_response: str) -> dict:
        """
        Determines a suitable facial expression and animation based on the AI's message.

        Returns:
            dict: A dictionary with keys 'facial_expression' and 'animation'.
        """

        # The available options you want the LLM to choose from
        facial_expressions_list = [
            "smile", 
            "sad", 
            "angry", 
            "surprised", 
            "funnyFace", 
            "default"
        ]

        animations_list = [
            "Talking_0", 
            "Talking_1", 
            "Talking_2", 
            "Crying", 
            "Laughing", 
            "Rumba", 
            "Idle", 
            "Terrified", 
            "Angry"
        ]

        prompt = f"""
You are given a list of possible facial expressions and animations. Based on the content and sentiment of the AI's response, choose the best matching facial expression and animation.

- Facial expressions: {', '.join(facial_expressions_list)}
- Animations: {', '.join(animations_list)}

Rules:
    1. Only respond with valid JSON. Example:
       {{
           "facial_expression": "smile",
           "animation": "Laughing"
       }}
    2. Do not include any extra text or explanation outside the JSON object.
    3. Ensure strict JSON formatting without any deviations.
    4. If the sentiment or tone is unclear, choose:
       {{
           "facial_expression": "default",
           "animation": "Idle"
       }}
    
    AI Response:
    "{ai_response}"
    """

        try:
            # Invoke the LLM with the prompt
            response = self.llm.invoke(prompt)
            logging.info(f"Raw LLM response: {response.content}")

            # Strip code fences if present
            content = response.content.strip()
            if content.startswith("```") and content.endswith("```"):
                content = '\n'.join(content.split('\n')[1:-1])

            # Parse the LLM response as JSON
            for attempt in range(3):  # Retry up to 3 times
                try:
                    parsed = json.loads(content)
                    break
                except json.JSONDecodeError:
                    logging.warning(f"LLM returned non-JSON response on attempt {attempt + 1}: {content}")
                    if attempt == 2:  # Max retries reached
                        parsed = {"facial_expression": "default", "animation": "Idle"}

            # Extract fields and validate them
            facial_expression = parsed.get("facial_expression", "default")
            animation = parsed.get("animation", "Idle")

            if facial_expression not in facial_expressions_list:
                logging.warning(f"Invalid facial expression: {facial_expression}. Defaulting to 'default'.")
                facial_expression = "default"
            if animation not in animations_list:
                logging.warning(f"Invalid animation: {animation}. Defaulting to 'Idle'.")
                animation = "Idle"

            return {
                "facial_expression": facial_expression,
                "animation": animation
            }

        except Exception as e:
            logging.error(f"AI-based facial expression & animation determination failed: {e}")
            # Fallback to defaults in case of error
            return {
                "facial_expression": "default",
                "animation": "Idle"
            }
