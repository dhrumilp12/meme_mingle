"""Set Flask configuration from environment variables."""
""" Step 1: Import the required libraries """
import os

""" Step 2: Define the Config class """
class Config:

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY")
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = 465
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_USE_SSL = True
    MAIL_USE_TLS = False
    SECURITY_PASSWORD_SALT = os.getenv("SECURITY_PASSWORD_SALT")
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER') or os.getenv('MAIL_USERNAME')