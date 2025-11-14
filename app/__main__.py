"""
Standalone app.py file for running the application
"""
import uvicorn
from app import app

print("Starting the application...")
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3005)