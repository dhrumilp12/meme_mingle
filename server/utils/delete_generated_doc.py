""" This module contains a job that deletes files older than a certain number of days from a directory. """
""" Step 1: Import necessary modules """
import os
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def delete_old_files_job():
    directories = [
        os.path.join(os.path.dirname(__file__), '..', 'generated_documents'),
        os.path.join(os.path.dirname(__file__), '..', 'generated_audio')
    ]
    days = 1  # Files older than 1 day will be deleted
    now = time.time()
    cutoff = now - (days * 86400)  # Number of seconds in 'days' days

    total_files_deleted = 0

    for directory in directories:
        if not os.path.exists(directory):
            logging.warning(f"Directory {directory} does not exist.")
            continue

        files_deleted = 0
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            if os.path.isfile(file_path):
                file_modified_time = os.path.getmtime(file_path)
                if file_modified_time < cutoff:
                    try:
                        os.remove(file_path)
                        files_deleted += 1
                    except Exception as e:
                        logging.error(f"Error deleting file {file_path}: {e}")

        total_files_deleted += files_deleted
        logging.info(f"Deleted {files_deleted} files older than {days} day(s) from {directory}.")

    logging.info(f"Total files deleted: {total_files_deleted}")