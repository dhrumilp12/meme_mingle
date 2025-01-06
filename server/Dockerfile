FROM python:3.12-slim AS builder

WORKDIR /app

# Update linux packages and install dependencies
RUN apt-get update && \
    apt-get install --no-install-suggests --no-install-recommends -y pipx ffmpeg wget unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:${PATH}"

ENV FLASK_RUN_HOST=0.0.0.0 \
    FLASK_RUN_PORT=8000 \
    FLASK_ENV=dev

RUN pipx install poetry

COPY poetry.lock pyproject.toml ./

RUN poetry install --no-root

COPY . ./

# Remove non-Linux Rhubarb binaries (if applicable)
RUN rm -rf models/rhubarb/Rhubarb-Lip-Sync-1.13.0-macOS && \
    rm -rf rhubarb/Rhubarb-Lip-Sync-1.13.0-Windows

# Rename .env.production
RUN mv .env.production .env

# Download and install Rhubarb Lip-Sync for Linux
RUN wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip -O rhubarb.zip && \
    unzip rhubarb.zip -d /opt/rhubarb && \
    chmod +x /opt/rhubarb/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb && \
    ln -s /opt/rhubarb/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb /usr/local/bin/rhubarb && \
    rm rhubarb.zip


# Set RHUBARB_PATH to the Linux Rhubarb executable
ENV RHUBARB_PATH=/usr/local/bin/rhubarb

# Execute Flask
CMD ["poetry", "run", "gunicorn", "-b", "0.0.0.0:8000", "app:app"]
