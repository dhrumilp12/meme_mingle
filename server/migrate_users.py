# Optional: Create indexes using a migration script or manually via MongoDB shell

# Example migration script (migrate_indexes.py)

from services.azure_mongodb import MongoDBClient

def create_indexes():
    db_client = MongoDBClient.get_client()
    db = db_client[MongoDBClient.get_db_name()]
    # Create a compound index on user_id and quiz_id
    db.user_responses.create_index([("user_id", 1), ("quiz_id", 1)])
    print("Created compound index on user_id and quiz_id in user_responses collection.")

if __name__ == "__main__":
    create_indexes()
