# tests/user_profile_test.py

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import pytest
from unittest import mock
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from MemeMingle.server.routes.user_profile import user_routes
import MemeMingle
from bson import ObjectId
from io import BytesIO

@pytest.fixture
def client():
    """
    Sets up a Flask test client with an application context
    so we can call create_access_token() without a 'working outside of application context' error.
    """
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'super-secret'
    
    JWTManager(app)
    app.register_blueprint(user_routes)

    with app.app_context():
        with app.test_client() as test_client:
            yield test_client


################################################################################
# HAPPY PATH TESTS
################################################################################

@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_get_public_profile_success(mock_mongo_client, client):
    """
    Test that calling GET /user/profile returns 200 OK if a valid JWT is included.
    Also ensure 'password' field is not in the returned JSON.
    """
    valid_id_str = "507f1f77bcf86cd799439011"

    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    # Mock the DB user doc
    mock_collection['users'].find_one.return_value = {
        "_id": ObjectId(valid_id_str),
        "username": "testuser",
        "password": "hashedpassword"
    }

    token = create_access_token(identity=valid_id_str)
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = client.get('/user/profile', headers=headers)
    assert response.status_code == 200
    assert 'password' not in response.json
    assert response.json['_id'] == valid_id_str
    assert response.json['username'] == 'testuser'


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_update_profile_fields_success(mock_mongo_client, client):
    """
    Test that calling PATCH /user/profile updates user fields successfully.
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    # This is the doc we find in DB
    mock_collection['users'].find_one.return_value = {
        "_id": ObjectId(valid_id_str),
        "username": "testuser"
    }

    token = create_access_token(identity=valid_id_str)
    headers = {
        'Authorization': f'Bearer {token}'
    }
    data = {
        "username": "newusername"
    }
    response = client.patch('/user/profile', data=data, headers=headers)
    assert response.status_code == 200
    assert response.json['message'] == "User has been updated successfully."


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_delete_profile_success(mock_mongo_client, client):
    """
    Test that calling DELETE /user/profile with valid JWT deletes the user.
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    mock_collection['users'].find_one.return_value = {
        "_id": ObjectId(valid_id_str),
    }

    token = create_access_token(identity=valid_id_str)
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = client.delete('/user/profile', headers=headers)
    assert response.status_code == 200
    assert response.json['message'] == "User has been deleted successfully."


################################################################################
# NEGATIVE / EDGE CASE TESTS
################################################################################

def test_get_public_profile_no_token(client):
    """
    If no JWT token is provided, we expect a 401 Unauthorized.
    """
    response = client.get('/user/profile')  # no headers
    assert response.status_code == 401
    assert 'Missing Authorization Header' in response.get_data(as_text=True)


def test_get_public_profile_invalid_token(client):
    """
    If an invalid JWT token is provided, we expect a 422 or 401 (depending on config).
    By default, Flask-JWT-Extended might return 401/422 with some error message.
    """
    headers = {
        'Authorization': 'Bearer this-is-not-a-valid-token'
    }
    response = client.get('/user/profile', headers=headers)
    # The exact code can be 401 or 422, depending on how JWTManager is configured
    # Typically 401 is default.
    assert response.status_code in [401, 422]
    # We can also check for an error message
    data = response.get_json()
    assert data is not None
    # The error key might differ; you can adapt this if needed:
    assert 'msg' in data or 'error' in data


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_get_public_profile_user_not_found(mock_mongo_client, client):
    """
    If the user doesn't exist in DB, we expect a 404.
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    # Simulate user not in DB
    mock_collection['users'].find_one.return_value = None

    token = create_access_token(identity=valid_id_str)
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = client.get('/user/profile', headers=headers)
    assert response.status_code == 404
    assert response.json == {"error": "User could not be found."}


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_update_profile_fields_user_not_found(mock_mongo_client, client):
    """
    If the DB has no user doc for the given ID, we expect a 404.
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    mock_collection['users'].find_one.return_value = None  # user doesn't exist

    token = create_access_token(identity=valid_id_str)
    headers = {
        'Authorization': f'Bearer {token}'
    }

    data = {"username": "anything"}
    response = client.patch('/user/profile', data=data, headers=headers)
    assert response.status_code == 404
    assert response.json == {"error": "User cannot be found."}


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_update_profile_fields_no_fields(mock_mongo_client, client):
    """
    If we pass no fields in the request, the route returns
    "No fields to update." with 200. Let's confirm that logic.
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    mock_collection['users'].find_one.return_value = {
        "_id": ObjectId(valid_id_str),
        "username": "testuser"
    }

    token = create_access_token(identity=valid_id_str)
    headers = {'Authorization': f'Bearer {token}'}

    # No data at all
    response = client.patch('/user/profile', headers=headers)
    # The route checks if update_fields is empty
    assert response.status_code == 200
    assert response.json == {"message": "No fields to update."}


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_update_profile_fields_invalid_image(mock_mongo_client, client):
    """
    If we pass a 'profile_picture' file but it's an invalid format, we get 400 "Invalid image format".
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    mock_collection['users'].find_one.return_value = {
        "_id": ObjectId(valid_id_str),
        "username": "testuser"
    }

    token = create_access_token(identity=valid_id_str)
    headers = {'Authorization': f'Bearer {token}'}

    # We'll simulate an invalid file format e.g. 'txt'
    data = {
        # This is how you send a file with the test client:
        'profile_picture': (BytesIO(b'fake image data'), 'invalid_file.txt')
    }

    response = client.patch('/user/profile', data=data, headers=headers, content_type='multipart/form-data')
    # The route should return 400
    assert response.status_code == 400
    assert response.json == {"error": "Invalid image format"}


@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_delete_profile_user_not_found(mock_mongo_client, client):
    """
    If the user doesn't exist in DB, we should get a 404 with the expected message.
    """
    valid_id_str = "507f1f77bcf86cd799439011"
    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    # Simulate user not found
    mock_collection['users'].find_one.return_value = None

    token = create_access_token(identity=valid_id_str)
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = client.delete('/user/profile', headers=headers)
    assert response.status_code == 404
    assert response.json == {"error": "User cannot be found."}
