""" This module contains a job that deletes files older than a certain number of days from a directory. """
""" Step 1: Import necessary modules """
import os
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

""" Step 2: Define the job """
def delete_old_files_job():
    directory = os.path.join(os.path.dirname(__file__), '..', 'generated_documents')
    days = 1  # Files older than 1 day will be deleted
    now = time.time()
    cutoff = now - (days * 86400)  # Number of seconds in 'days' days

    files_deleted = 0

    if not os.path.exists(directory):
        logging.warning(f"Directory {directory} does not exist.")
        return

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

    logging.info(f"Deleted {files_deleted} files older than {days} day(s) from {directory}.")
