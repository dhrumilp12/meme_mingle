"""This module contains the routes for the user profile."""

"""Step 1: Import the required libraries"""
from services.azure_mongodb import MongoDBClient
from flask import Blueprint, request, jsonify
from bson import ObjectId
from flask import current_app
import os
from flask_jwt_extended import jwt_required, get_jwt_identity
"""Step 2: Define the user_routes blueprint"""
user_routes = Blueprint('user_routes', __name__)

""""Step 3: Define the routes"""
# Get the user profile
@user_routes.get('/user/profile')
@jwt_required()
def get_public_profile():
    user_id = get_jwt_identity()
    db_client = MongoDBClient.get_client()
    db = db_client[MongoDBClient.get_db_name()]

    user_data = db['users'].find_one({"_id": ObjectId(user_id)})
    if user_data is None:
        return jsonify({"error": "User could not be found."}), 404
    
    # Remove sensitive information like passwords
    user_data.pop('password', None)
    
    # Convert _id from ObjectId to string if needed
    user_data['_id'] = str(user_data['_id'])
    print('user_data:', user_data)
    return jsonify(user_data), 200

# Update the user profile
@user_routes.patch('/user/profile')
@jwt_required()
def update_profile_fields():
    try:
        user_id = get_jwt_identity()
        update_fields = request.form.to_dict()
        
        if not update_fields or not isinstance(update_fields, dict):
            return jsonify({"error": "No valid fields provided for update."}), 400
        
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        
        user = db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User cannot be found."}), 404
        
        # Handle profile picture update
        if 'profile_picture' in update_fields and user.get('profile_picture'):
            old_picture_path = os.path.join(os.getcwd(), user['profile_picture'].lstrip('/'))
            if os.path.exists(old_picture_path):
                os.remove(old_picture_path)
        
        result = db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
        
        if result.modified_count == 0:
            return jsonify({"message": "No changes were made to the user profile."}), 200
        
        return jsonify({"message": "User has been updated successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Error updating user profile: {str(e)}")
        return jsonify({"error": "An error occurred while updating the profile."}), 500

# Delete the user profile
@user_routes.delete('/user/profile')
@jwt_required()
def delete_profile():
    try:
        user_id = get_jwt_identity()
        db_client = MongoDBClient.get_client()
        db = db_client[MongoDBClient.get_db_name()]
        
        user = db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User cannot be found."}), 404
        
        # Delete profile picture if it exists
        profile_picture = user.get('profile_picture')
        if profile_picture:
            picture_path = os.path.join(os.getcwd(), profile_picture.lstrip('/'))
            if os.path.exists(picture_path):
                os.remove(picture_path)
        
        result = db["users"].delete_one({"_id": ObjectId(user_id)})
        
        return jsonify({"message": "User has been deleted successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting user profile: {str(e)}")
        return jsonify({"error": "An error occurred while deleting the profile."}), 500