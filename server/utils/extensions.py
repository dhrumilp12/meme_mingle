""" Flask extensions """
""" Step 1: Importing required libraries"""
from authlib.integrations.flask_client import OAuth
from flask_mail import Mail

""" Step 2: Creating instances of the extensions """
mail = Mail()
oauth = OAuth()
