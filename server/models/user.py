"""This module defines the User model, which represents a user in the system."""
""" Step 1: Import required libraries """
from pydantic import BaseModel, EmailStr, Field, field_validator, validator
from services.azure_mongodb import MongoDBClient
from bson import ObjectId
from email_validator import validate_email, EmailNotValidError
from typing import Optional

""" Step 2: Define the User model """
class User(BaseModel):
    id: str = None
    username: str = Field(..., min_length=3, max_length=20)
    email: EmailStr
    password: Optional[str] = Field(None, min_length=6)
    name: str = None
    age: int = Field(None, ge=18)  # Age should be a non-negative integer
    gender: str = Field(None, pattern='^(male|female|other)$')  # Example to validate gender
    placeOfResidence: str = None
    fieldOfStudy: str = None
    preferredLanguage: str = Field(None, pattern='^[a-z]{2}$')  
    profile_picture: Optional[str] = Field("https://i.pinimg.com/736x/0d/64/98/0d64989794b1a4c9d89bff571d3d5842.jpg")
    google_id: str = None
    total_score: int = 0 
    

    """ Step 3: Define class methods """
    # Define a class method to validate the password field
    @validator('password')
    def validate_password(cls, v, values, **kwargs):
        # Allow password to be None (for OAuth users)
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError('Password must be a string')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    # Define a class method to find a user by username
    @field_validator('username')
    def username_alphanumeric(cls, v):
        assert v.isalnum(), 'must be alphanumeric'
        return v
    
    # Define a class method to validate the email field
    @field_validator('email')
    def validate_email_field(cls, v):
        try:
            valid = validate_email(v)
            return valid.email
        except EmailNotValidError as e:
            raise ValueError(str(e))

    # Define a class method to find a user by username
    @classmethod
    def find_by_username(cls, username):
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        user_data = db.users.find_one({"username": username})  # 'users' is the collection name
        if user_data:
            user_data['id'] = str(user_data['_id'])
            return cls(**user_data)
        return None
    
    # Define a class method to find a user by email
    @classmethod
    def update_password(cls, username, new_hashed_password):
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        result = db.users.update_one({"username": username}, {"$set": {"password": new_hashed_password}})
        return result.modified_count == 1
    
    # Define a class method to find a user by ID
    @classmethod
    def find_by_id(cls, user_id):
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        user_data = db.users.find_one({"_id": ObjectId(user_id)})
        if user_data:
            user_data['id'] = str(user_data['_id'])
            return cls(**user_data)
        return None
    
    # Define a class method to find a user by email
    @classmethod
    def find_by_email(cls, email):
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        user_data = db.users.find_one({"email": email})
        if user_data:
            user_data['id'] = str(user_data['_id'])
            return cls(**user_data)
        return None