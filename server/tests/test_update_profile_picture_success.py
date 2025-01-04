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

@mock.patch('os.remove')
@mock.patch('os.path.exists')
@mock.patch('werkzeug.datastructures.FileStorage.save')
@mock.patch('MemeMingle.server.routes.user_profile.MongoDBClient')
def test_update_profile_picture_success(
    mock_mongo_client,
    mock_file_save,
    mock_path_exists,
    mock_os_remove,
    client
):
    valid_id_str = "507f1f77bcf86cd799439011"
    old_picture_path = "/static/profile_pics/testuser_old.png"

    mock_db = mock_mongo_client.get_client.return_value
    mock_collection = mock_db[MemeMingle.server.routes.user_profile.MongoDBClient.get_db_name()]
    mock_collection['users'].find_one.return_value = {
        "_id": ObjectId(valid_id_str),
        "username": "testuser",
        "profile_picture": old_picture_path
    }

    # Simulate that the old file exists
    mock_path_exists.return_value = True

    # JWT
    token = create_access_token(identity=valid_id_str)
    headers = {'Authorization': f'Bearer {token}'}

    data = {
        'profile_picture': (BytesIO(b'fake image data'), 'new_profile.png'),
        'someOtherField': 'someValue'
    }

    response = client.patch(
        '/user/profile',
        data=data,
        headers=headers,
        content_type='multipart/form-data'
    )

    # Check update_one call
    mock_collection['users'].update_one.assert_called_once()
    args, kwargs = mock_collection['users'].update_one.call_args

    # The first positional arg is the filter
    assert args[0] == {"_id": ObjectId(valid_id_str)}
    # The second positional arg is {"$set": update_fields}
    assert "$set" in args[1]
    updated_fields = args[1]["$set"]
    assert "profile_picture" in updated_fields
    assert updated_fields["profile_picture"].startswith("/static/profile_pics/testuser_")

    # Response checks
    assert response.status_code == 200
    resp_data = response.get_json()
    assert resp_data['message'] == "User has been updated successfully."
    new_profile_pic = resp_data['profile_picture']
    assert new_profile_pic.startswith("/static/profile_pics/testuser_")
    assert new_profile_pic.endswith(".png")

    # Verify old file removal
    joined_old_path = os.path.join(os.getcwd(), old_picture_path.lstrip('/'))
    mock_path_exists.assert_called_once_with(joined_old_path)
    mock_os_remove.assert_called_once_with(joined_old_path)

    # Verify new file was saved
    called_args, _ = mock_file_save.call_args
    new_save_path = called_args[0]
    assert "testuser_new_profile.png" in new_save_path
    assert os.path.join("static", "profile_pics") in new_save_path
