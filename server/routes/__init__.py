"""Initialize Flask blueprints."""
"""step 1: Import the required libraries"""
from .auth import auth_routes
from .AI import ai_routes
from .user_profile import user_routes
from .translator import translator_routes
from .quiz_ai import quiz_ai_routes

"""step 2: Define the register_blueprints function"""
def register_blueprints(app):
    """Register Flask blueprints."""
    app.register_blueprint(auth_routes)
    app.register_blueprint(ai_routes)
    app.register_blueprint(user_routes)
    app.register_blueprint(translator_routes)
    app.register_blueprint(quiz_ai_routes)
    
    