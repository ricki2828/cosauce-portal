"""
CoSauce Platform - Backend API
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import CORS_ORIGINS, HOST, PORT
from .api import contracts, sales, pitch, outreach

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events"""
    print("CoSauce Platform API starting...")
    yield
    print("CoSauce Platform API shutting down...")

app = FastAPI(
    title="CoSauce Platform API",
    description="Backend API for CoSauce executive tools",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(pitch.router, prefix="/api/pitch", tags=["Pitch"])
app.include_router(outreach.router, prefix="/api/outreach", tags=["Outreach"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "cosauce-platform"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "CoSauce Platform API",
        "version": "1.0.0",
        "docs": "/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
