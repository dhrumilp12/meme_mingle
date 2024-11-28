""" This module contains functions to generate and verify reset tokens. """
""" STEP 1: Import required libraries """
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask import current_app
from models.user import User as UserModel

""" STEP 2: Define functions to generate and verify reset tokens """
def generate_reset_token(email):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt=current_app.config['SECURITY_PASSWORD_SALT'])

def verify_reset_token(token):
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt=current_app.config['SECURITY_PASSWORD_SALT'], max_age=3600)
    except (SignatureExpired, BadSignature):
        return None
    return UserModel.find_by_email(email)