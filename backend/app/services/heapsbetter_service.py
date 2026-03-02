"""
Heapsbetter.ai ATS Integration Service
Connects to the Heapsbetter public API for job and candidate management
"""
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Optional

import httpx

from ..config import HEAPSBETTER_API_KEY, DATA_DIR


DB_PATH = DATA_DIR / "portal.db"


class HeapsbetterService:
    """Service for Heapsbetter ATS API integration"""

    BASE_URL = "https://egysvffbxaweluoeoetl.supabase.co/functions/v1/public-api"

    def __init__(self):
        self.api_key = HEAPSBETTER_API_KEY
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy-load the HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    def is_configured(self) -> bool:
        """Check if Heapsbetter API key is configured"""
        return bool(self.api_key)

    # ------------------------------------------------------------------
    # Cache helpers (synchronous sqlite3 — lightweight cache table ops)
    # ------------------------------------------------------------------

    def _get_cached(self, key: str) -> Optional[dict]:
        """Return cached data if present and not expired, else None"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT data FROM ats_cache WHERE cache_key = ? AND expires_at > datetime('now')",
                (key,),
            )
            row = cursor.fetchone()
            conn.close()
            if row:
                return json.loads(row[0])
        except Exception:
            pass
        return None

    def _set_cached(self, key: str, data, ttl_seconds: int = 300) -> None:
        """Store data in ats_cache with an expiry"""
        expires_at = (datetime.utcnow() + timedelta(seconds=ttl_seconds)).isoformat()
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT OR REPLACE INTO ats_cache (cache_key, data, cached_at, expires_at) "
                "VALUES (?, ?, datetime('now'), ?)",
                (key, json.dumps(data), expires_at),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

    def _invalidate_cache(self, key_prefix: str) -> None:
        """Delete all cache entries whose key starts with key_prefix"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "DELETE FROM ats_cache WHERE cache_key LIKE ?",
                (key_prefix + "%",),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

    # ------------------------------------------------------------------
    # API methods
    # ------------------------------------------------------------------

    async def list_jobs(self, force_refresh: bool = False):
        """GET /jobs — cached for 5 minutes"""
        cache_key = "jobs:list"
        if not force_refresh:
            cached = self._get_cached(cache_key)
            if cached is not None:
                return cached

        response = await self.client.get(f"{self.BASE_URL}/jobs")
        response.raise_for_status()
        data = response.json()
        self._set_cached(cache_key, data, ttl_seconds=300)
        return data

    async def get_job(self, job_id: str):
        """GET /jobs/{job_id} — always live"""
        response = await self.client.get(f"{self.BASE_URL}/jobs/{job_id}")
        response.raise_for_status()
        return response.json()

    async def create_job(self, payload: dict):
        """POST /jobs — invalidates list cache"""
        response = await self.client.post(f"{self.BASE_URL}/jobs", json=payload)
        response.raise_for_status()
        self._invalidate_cache("jobs:")
        return response.json()

    async def update_job(self, job_id: str, payload: dict):
        """PATCH /jobs/{job_id} — invalidates cache"""
        response = await self.client.patch(f"{self.BASE_URL}/jobs/{job_id}", json=payload)
        response.raise_for_status()
        self._invalidate_cache("jobs:")
        return response.json()

    async def get_candidates(self, job_id: str):
        """GET /jobs/{job_id}/candidates — always live"""
        response = await self.client.get(f"{self.BASE_URL}/jobs/{job_id}/candidates")
        response.raise_for_status()
        return response.json()

    async def get_pipeline_stages(self, job_id: str):
        """GET /jobs/{job_id}/stages — always live"""
        response = await self.client.get(f"{self.BASE_URL}/jobs/{job_id}/stages")
        response.raise_for_status()
        return response.json()

    async def get_analytics_overview(self):
        """GET /analytics/overview — cached 5 minutes"""
        cache_key = "analytics:overview"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        response = await self.client.get(f"{self.BASE_URL}/analytics/overview")
        response.raise_for_status()
        data = response.json()
        self._set_cached(cache_key, data, ttl_seconds=300)
        return data

    async def close(self):
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None


# Module-level singleton
_service: Optional[HeapsbetterService] = None


async def get_heapsbetter_service() -> HeapsbetterService:
    global _service
    if _service is None:
        _service = HeapsbetterService()
    return _service
