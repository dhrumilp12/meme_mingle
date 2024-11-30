
# -- Standard libraries --
# -- 3rd Party libraries --
# Azure
# Langchain
# MongoDB
# -- Custom modules --

"""
This module defines a class used to generate AI agents centered around Educational applications.
"""

"""Step 1: Import necessary modules"""
# -- Standard libraries --
from datetime import datetime
import logging
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
# Constants
from utils.consts import SYSTEM_MESSAGE



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
    
    def __init__(self, system_message: str = SYSTEM_MESSAGE, tool_names: list[str] = [], desired_role: str = "educational mentor"):
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

        # Do not set self.prompt here
        # self.prompt = ChatPromptTemplate.from_messages([...])

        # Initialize the agent executor to None; it will be set in the run method
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


    def exec_update_step(self, user_id, chat_id=None, turn_id=None):
        # Chat Summary:
        # Update every 5 chat turns
        # Therapy Material
        # Maybe not get it from DB at all? Just perform Bing search?
        # User Entity:
        # Can be saved from chat summary step, every 5 chat turns
        # User Journey:
        # Can be either updated at the end of the chat, or every 5 chat turns
        # User Material:
        # Possibly updated every 5 chat turns, at the end of a chat, or not at all



        # agent_with_history = RunnableWithMessageHistory(
        #     chain,
        #     get_session_history=lambda _: memory,
        #     input_messages_key="input",
        #     history_messages_key="history",
        #     verbose=True
        # )
        

        # self.agent = create_tool_calling_agent(self.llm, self.tools, self.prompt)
        # stateless_agent_executor:AgentExecutor = AgentExecutor(
        #     agent=self.agent, tools=self.tools, verbose=True, handle_parsing_errors=True)
        
        # history=self.get_session_history(f"{user_id}-{chat_id}-{}")
        # Must invoke with an agent that will not write to DB
        # invocation = stateless_agent_executor.invoke(
        #     {"input": f"{message}\nuser_id:{user_id}", "agent_scratchpad": []})

        # Get summary text
        pass
    
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
            audio_url = self.convert_text_to_speech(ai_text_response, user_id, chat_id, turn_id)

            # Structure the response to include both text and meme/GIF
            response = {
                "message": ai_text_response,
                "meme_url": meme_url,
                "audio_url": audio_url
            }

            return response
        except Exception as e:
            logging.error(f"Error during agent execution: {e}", exc_info=True)
            raise   

   
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
            # Assuming `self.llm` is your language model instance
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
        This is your first session with the patient. Be polite and introduce yourself in a friendly and inviting manner.
        In this session, do your best to understand what the user hopes to achieve through your service, and derive a therapy style fitting to their needs.
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

    def convert_text_to_speech(self, text: str, user_id: str, chat_id: int, turn_id: int) -> str:
        """
        Converts the given text to speech and returns the URL of the audio file.
        
        Args:
            text (str): The text to convert to speech.
            user_id (str): The unique identifier for the user.
            chat_id (int): The unique identifier for the chat.
            turn_id (int): The turn number in the chat.
        
        Returns:
            str: The URL to access the generated audio file.
        """
        try:
            audio_data = text_to_speech(text)
            # Define a unique filename
            filename = f"{user_id}_{chat_id}_{turn_id}.wav"
            file_path = os.path.join('generated_audio', filename)
            
            # Ensure the directory exists
            os.makedirs('generated_audio', exist_ok=True)
            
            # Save the audio file
            with open(file_path, 'wb') as f:
                f.write(audio_data)
            
            backend_base_url = os.getenv('BACKEND_BASE_URL', 'http://localhost:8000')  # Ensure this environment variable is set
            audio_url = f"{backend_base_url}/ai_mentor/download_audio/{filename}"
            return audio_url
        except Exception as e:
            logging.error(f"Text-to-speech conversion failed: {e}")
            return ""