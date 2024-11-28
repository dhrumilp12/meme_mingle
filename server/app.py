"""
This module is the entry point of the application. It initializes the Flask app, registers the routes, and starts the server.
"""

""" Step 1: Import required libraries """
from dotenv import load_dotenv
from utils.extensions import oauth, mail
import os
from flask import Flask
from flask_cors import CORS
from config.config import Config
from flask_jwt_extended import JWTManager
from routes import register_blueprints
from services.db.agent_facts import load_agent_facts_to_db
from flask_apscheduler import APScheduler
from utils.delete_generated_doc import delete_old_files_job
import logging  

""" Load environment variables """
load_dotenv()

""" Step 2: Define the run_app function """
def run_app():
    
    app = Flask(__name__)

    app.config.from_object(Config)
    jwt = JWTManager(app)
    mail.init_app(app)

    cors_config = {
        r"*": {
            "origins": [os.getenv("BASE_URL")],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-CSRF-Token"
            ],
            "supports_credentials": True  # Allow sending cookies
        }
    }
    CORS(app, resources=cors_config)

    # Initialize OAuth and register providers
    oauth.init_app(app)
    oauth.register(
        name='google',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'},
    )

    # Register routes
    register_blueprints(app)

    # Base endpoint
    @app.get("/")
    def root():
        """
        Health probe endpoint.
        """    
        return {"status": "ready"}
    
    
    # Initialize APScheduler
    scheduler = APScheduler()
    scheduler.init_app(app)

    # Schedule the delete_old_files_job function
    scheduler.add_job(
        id='Delete Old Files',
        func=delete_old_files_job,
        trigger='cron',
        hour=0, minute=0  # Run daily at midnight
    )

    scheduler.start()

    return app, jwt, mail


""" Step 3: Run the app """
app, jwt, mail = run_app()

""" Step 4: Start the server """
if __name__ == '__main__':
    HOST = os.getenv("FLASK_RUN_HOST") or "0.0.0.0"
    PORT = os.getenv("FLASK_RUN_PORT") or 8000
    # DB pre-load
    load_agent_facts_to_db()
    app.run(debug=True, host=HOST, port=PORT)
