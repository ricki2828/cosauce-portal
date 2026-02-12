"""
CoSauce Platform - Backend API
"""
# Thread limits must be set FIRST before any imports to reduce memory
import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['RAYON_NUM_THREADS'] = '1'

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import CORS_ORIGINS, HOST, PORT
from .api import contracts, sales, pitch, outreach, auth, users, priorities, people, business_updates, pipeline, onboarding, talent, invoicing

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
    expose_headers=["*"],
)

# Add middleware to prevent caching of API responses
from starlette.middleware.base import BaseHTTPMiddleware

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

# CORS exception handler to ensure CORS headers on error responses
from starlette.responses import JSONResponse
from starlette.requests import Request

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Add CORS headers to HTTPException responses"""
    origin = request.headers.get("origin")
    headers = {}
    if origin in CORS_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )

# Include routers
app.include_router(auth.router, prefix="/api")  # Auth routes already have /auth prefix
app.include_router(users.router, prefix="/api")  # Users routes already have /users prefix
app.include_router(priorities.router, prefix="/api")  # Priorities routes already have /priorities prefix
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(pitch.router, prefix="/api/pitch", tags=["Pitch"])
app.include_router(outreach.router, prefix="/api/outreach", tags=["Outreach"])
app.include_router(people.router, prefix="/api/people", tags=["People"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(business_updates.router, prefix="/api/business-updates", tags=["Business Updates"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(talent.router, prefix="/api/talent", tags=["Talent"])
app.include_router(invoicing.router, prefix="/api/invoicing", tags=["Invoicing"])

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
