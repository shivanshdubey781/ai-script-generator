from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager

from app.database.init_db import init_db
from app.api import auth, scripts, admin, users, video, otp
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create MongoDB indexes on startup."""
    init_db()
    yield


app = FastAPI(
    title="AI Script Generator API",
    description="Generate viral social media scripts using Groq AI — backed by MongoDB",
    version="2.0.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# CORS — allow all in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(scripts.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(otp.router, prefix="/api")



@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": "2.0.0", "db": "mongodb"}


@app.get("/api/status", tags=["health"])
def status_check():
    """Alias for /api/health — silences browser-extension probes."""
    return {"status": "ok"}
