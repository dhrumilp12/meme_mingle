""" Generate a secret key for JWT token. """

""" Step 1: Import required libraries """
import secrets

""" Step 2: Generate a secret key """
JWT_key = secrets.token_urlsafe(32)
print(JWT_key)

# Generate a 32-byte secret key
secret_key = secrets.token_urlsafe(32)
print(f"SECRET_KEY={secret_key}")

# Generate a 16-byte security password salt
security_password_salt = secrets.token_urlsafe(16)
print(f"SECURITY_PASSWORD_SALT={security_password_salt}")