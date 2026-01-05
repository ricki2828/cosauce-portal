#!/usr/bin/env python3
"""
Run the CoSauce Platform backend
"""
import uvicorn
from app.config import HOST, PORT

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=False,  # Disabled for production - saves memory
        workers=1,
        log_level="info",
    )
