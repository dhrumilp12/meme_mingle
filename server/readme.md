# Flask Backend Application

This is the backend of the project built using **Python** and **Flask**, a lightweight web framework for building web applications. This document provides instructions on how to set up and run the Flask server, including dependencies and configurations.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- Python 3.8+
- Virtualenv (optional but recommended)
- Git (for cloning the repository)
- A package manager like `pip`

## Project Setup

1. **Clone the repository**:
   ```
   git clone https://github.com/dhrumilp12/.git
   cd server
   ```

2. **Create and activate a virtual environment (optional but recommended)**:
    ```
    python -m venv venv
    source venv/bin/activate  # On Windows use: .\venv\Scripts\Activate.ps1
    ```

3. **Configure environment variables**:
   - Copy the `.env.example` file to a new file named `.env`.
   - Update the `.env` file with your specific configurations.
   ```
   cp .env.example .env
   ```
4.  **Install the required dependencies**:
    ```
    pip install -r requirements.txt
    ```

5. **Run app.py**
   ```
   python app.py
   ```

