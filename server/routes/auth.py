"""This module defines the routes for user authentication and registration"""

""" Step 1: Importing required libraries"""
import logging
from utils.extensions import oauth, mail
from flask import Blueprint, request, jsonify, current_app, url_for, redirect, session
import os
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from services.azure_mongodb import MongoDBClient
from models.user import User as UserModel
from dotenv import load_dotenv
from pydantic import ValidationError
from email_validator import validate_email, EmailNotValidError
from secrets import token_urlsafe
from flask_mail import Message
from utils.reset_tokens import generate_reset_token, verify_reset_token
from werkzeug.utils import secure_filename
"""Step 2: Configurations"""
load_dotenv()


"""Step 3: Creating a blueprint for the auth routes"""
auth_routes = Blueprint("auth", __name__)


# Define the upload folder and allowed extensions
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'profile_pics')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


"""Step 4: Defining routes"""

#Route for user registration
@auth_routes.post('/user/signup')
def signup():
    try:
        logging.info("Starting user registration process")
        user_data = request.form.to_dict()
        logging.info(f"Received user data: {user_data}")

        # Handle profile picture upload
        if 'profile_picture' in request.files:
            file = request.files['profile_picture']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Generate a unique filename
                unique_filename = f"{user_data['username']}_{filename}"
                file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(file_path)
                # Generate the URL link to the profile picture
                user_data['profile_picture'] = f"/static/profile_pics/{unique_filename}"
            else:
                return jsonify({"error": "Invalid image format"}), 400
        else:
            user_data['profile_picture'] = None  # or set a default image URL

        # Ensure 'preferredLanguage' is provided, else set a default (e.g., 'en')
        if 'preferredLanguage' not in user_data or not user_data['preferredLanguage']:
            user_data['preferredLanguage'] = 'en'  # Default language is English

        user = UserModel(**user_data)

        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        
        # Check if user already exists with the same username or email
        logging.info("Checking for existing users")
        existing_user = db['users'].find_one({"$or": [{"username": user.username}, {"email": user.email}]})
        if existing_user:
            logging.info("User already exists")
            return jsonify({"error": "User with this username or email already exists"}), 409
        
        hashed_password = generate_password_hash(user.password)
        user_data['password'] = hashed_password
        result = db['users'].insert_one(user_data)
        if result:
            logging.info("User registration successful")
            user_id = result.inserted_id
            access_token = create_access_token(identity=str(user_id), expires_delta=timedelta(hours=72))

            return jsonify({
                "message": "User registered successfully",
                "access_token": access_token,
                "userId": str(user_id),
                "preferredLanguage": user.preferredLanguage or 'en',
                "profile_picture": user.profile_picture
            }), 201
        else:
            logging.error("Failed to save user")
            return jsonify({"error": "Failed to register user"}), 500
    except Exception as e:
        logging.error(f"Exception during registration: {str(e)}")
        return jsonify({"error": str(e)}), 400



#Route for user login
@auth_routes.post('/user/login')

def login():
    try:
        # Get the identifier and password from the request
        identifier = request.json.get('identifier', None)
        password = request.json.get('password', None)
        
        if not identifier or not password:
            return jsonify({"msg": "Missing identifier or password"}), 400

        # Validate if identifier is an email
        try:
            # Attempt to validate identifier as an email
            validate_email(identifier)
            is_email = True
        except EmailNotValidError:
            is_email = False

        # Find user by email or username
        if is_email:
            user = UserModel.find_by_email(identifier)
        else:
            user = UserModel.find_by_username(identifier)
        
        if user and check_password_hash(user.password, password):
            access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=72))
            return jsonify({
                "access_token": access_token,
                "userId": str(user.id),
                "preferredLanguage": user.preferredLanguage or 'en'  # Include preferredLanguage
            }), 200
        else:
            return jsonify({"msg": "Invalid identifier or password"}), 401
        
    except ValidationError as ve:
        logging.error(f"Validation error: {ve}")
        return jsonify({"error": ve.errors()}), 400
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500





#Route for user logout
@auth_routes.post('/user/logout')

@jwt_required()
def logout():
    # JWT Revocation or Blacklisting could be implemented here if needed
    jwt_id = get_jwt_identity()
    logging.info(f"User {jwt_id} logged out successfully")

    return jsonify({"msg": "Logout successful"}), 200




# Route to start Google OAuth
@auth_routes.route('/auth/google')
def google_login():
    scheme = "https" if request.is_secure else "http"
    redirect_uri = url_for('auth.google_callback', _external=True, _scheme=scheme)
    nonce = token_urlsafe(16)  # Generate a secure random nonce
    session['oauth_nonce'] = nonce  # Store the nonce in the session
    logging.info(f"Redirect URI: {redirect_uri}")
    return oauth.google.authorize_redirect(redirect_uri, nonce=nonce)

# Route to handle Google OAuth callback
@auth_routes.route('/auth/google/callback')
def google_callback():
    try:
        token = oauth.google.authorize_access_token()
        nonce = session.pop('oauth_nonce', None)  # Retrieve and remove the nonce from the session

        if not nonce:
            logging.error("Nonce not found in session")
            return jsonify({'error': 'Session expired or invalid'}), 400
        
        # Add claims_options to specify the expected issuer
        claims_options = {
            'iss': {
                'values': ['https://accounts.google.com', 'accounts.google.com'],
            },
            'aud': {
                'values': [os.getenv('GOOGLE_CLIENT_ID')],
            },
            'nonce': {
                'values': [nonce],
            },
        }
       
        user_info = oauth.google.parse_id_token(token, nonce=nonce, claims_options=claims_options)
        print(f"User info: {user_info}")
        email = user_info.get('email')
        name = user_info.get('name')
        google_id = user_info.get('sub')
        profile_picture = user_info.get('picture')
        print(f"Email: {email}, Name: {name}, Google ID: {google_id}, Profile Picture: {profile_picture}")

        if not email:
            return jsonify({'error': 'Failed to retrieve email from Google'}), 400

        # Check if user already exists
        user = UserModel.find_by_email(email)

        if not user:
            # Create a new user
            user_data = {
                'username': email.split('@')[0],
                'email': email,
                'name': name,
                'google_id': google_id,
                'profile_picture': profile_picture,
            }
            db_client = MongoDBClient.get_client()
            db = db_client[MongoDBClient.get_db_name()]
            result = db['users'].insert_one(user_data)
            user_id = result.inserted_id
        else:
            user_id = user.id

        # Generate JWT token
        access_token = create_access_token(
            identity=str(user_id),
            expires_delta=timedelta(hours=72)
        )
        # Redirect to frontend with token and user ID
        frontend_redirect_url = os.getenv('BASE_URL')  # e.g., 'http://localhost:4200'
        print(f"Frontend redirect URL: {frontend_redirect_url}")
        redirect_url = f"{frontend_redirect_url}/auth/auth-callback?token={access_token}&userId={user_id}"
        return redirect(redirect_url, code=302)

    except Exception as e:
        logging.error(f"Google login error: {str(e)}")
        return jsonify({'error': 'Authentication failed'}), 500
    


# Route to request password reset
@auth_routes.post('/user/request_reset')
def request_password_reset():
    try:
        data = request.get_json()
        email = data.get('email')
        if not email:
            logging.warning("No email provided in the request")
            return jsonify({"error": "Email is required"}), 400
        
        user = UserModel.find_by_email(email)
        if not user:
            logging.info(f"No user found with email: {email}")
            return jsonify({"message": "No user found with this email"}), 404

        token = generate_reset_token(user.email)
        base_url = os.getenv('RESET_PASSWORD_BASE_URL', 'http://localhost:3000/reset_password/')  # Default if not set
        reset_url = f"{base_url}{token}"
        
        # Retrieve MAIL_DEFAULT_SENDER
        mail_sender = current_app.config.get('MAIL_DEFAULT_SENDER')
        
        if not mail_sender:
            logging.error("MAIL_DEFAULT_SENDER is not set.")
            return jsonify({"error": "Email sender is not configured."}), 500
        
        # Construct the Message object
        msg = Message(
            subject="Password Reset Request",
            sender=mail_sender,
            recipients=[user.email]
        )
        msg.body = f"Please click on the link to reset your password: {reset_url}"
        
        mail.send(msg)
        logging.info(f"Password reset email sent to {user.email}")
            
        return jsonify({"message": "Check your email for the reset password link"}), 200
    except Exception as e:
        logging.error(f"Exception during password reset request: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500


# Route to reset password
@auth_routes.post('/user/reset_password/<token>')
def reset_password(token):
    new_password = request.json.get('password')
    user = verify_reset_token(token)
    if not user:
        return jsonify({"error": "Invalid or expired token"}), 403

    new_password_hash = generate_password_hash(new_password)
    user.update_password(user.username, new_password_hash)
    
    return jsonify({"message": "Password has been reset successfully"}), 200



