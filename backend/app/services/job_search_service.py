"""
Job Search Service - Finds job postings matching targeting criteria
Uses JSearch API (RapidAPI) or falls back to curated results
"""
import os
import httpx
from typing import Optional, List, Dict, Tuple
from datetime import datetime
from dataclasses import dataclass


@dataclass
class JobResult:
    """Normalized job posting result"""
    job_id: str
    title: str
    company: str
    location: str
    country: str
    job_url: Optional[str]
    description: str
    posted_date: Optional[str]
    employment_type: Optional[str]
    source: str
    signal_type: Optional[str] = None
    signal_strength: int = 1


class JobSearchService:
    """Service to search for job postings across job boards"""

    def __init__(self):
        self.rapidapi_key = os.getenv("RAPIDAPI_KEY", "")
        self.base_url = "https://jsearch.p.rapidapi.com"

    async def search_jobs(
        self,
        query: str,
        location: str = "Canada",
        num_results: int = 20,
        date_posted: str = "month"  # all, today, 3days, week, month
    ) -> Dict:
        """
        Search for job postings matching criteria

        Args:
            query: Search terms (e.g., "bilingual customer service representative")
            location: Location filter (e.g., "Canada", "Toronto, ON")
            num_results: Number of results to return
            date_posted: How recent the postings should be

        Returns:
            Dict with jobs list and metadata
        """
        if self.rapidapi_key:
            return await self._search_jsearch(query, location, num_results, date_posted)
        else:
            # Return curated Canadian bilingual CSR job data
            return self._get_sample_jobs(query, location)

    async def _search_jsearch(
        self,
        query: str,
        location: str,
        num_results: int,
        date_posted: str
    ) -> Dict:
        """Search using JSearch API on RapidAPI"""
        headers = {
            "X-RapidAPI-Key": self.rapidapi_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }

        # Calculate pages needed (each page has ~10 results)
        pages_needed = min(10, max(1, (num_results + 9) // 10))

        params = {
            "query": f"{query} in {location}",
            "page": "1",
            "num_pages": str(pages_needed),
            "date_posted": date_posted
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/search",
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()

                jobs = []
                for job in data.get("data", [])[:num_results]:
                    city = job.get("job_city") or ""
                    state = job.get("job_state") or ""
                    job_location = f"{city}, {state}".strip(", ") if city or state else job.get("job_country", "")

                    jobs.append({
                        "job_id": job.get("job_id"),
                        "title": job.get("job_title"),
                        "company": job.get("employer_name"),
                        "company_logo": job.get("employer_logo"),
                        "location": job_location,
                        "country": job.get("job_country"),
                        "job_url": job.get("job_apply_link") or job.get("job_google_link"),
                        "description": (job.get("job_description") or "")[:2000],
                        "posted_date": job.get("job_posted_at_datetime_utc"),
                        "employment_type": job.get("job_employment_type"),
                        "source": job.get("job_publisher", "JSearch")
                    })

                return {
                    "success": True,
                    "jobs": jobs,
                    "total_found": len(jobs),
                    "query": query,
                    "location": location,
                    "source": "jsearch_api"
                }

            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "jobs": [],
                    "source": "jsearch_api"
                }

    def _get_sample_jobs(self, query: str, location: str) -> Dict:
        """Return curated sample jobs when no API key available"""
        sample_jobs = [
            {
                "job_id": "sample_1",
                "title": "Bilingual Customer Service Representative (French/English)",
                "company": "TD Bank",
                "location": "Toronto, ON",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingual+customer+service+TD+Bank",
                "description": "TD Bank is seeking Bilingual Customer Service Representatives. Handle inbound calls in French and English, assist with banking inquiries, resolve customer issues.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_2",
                "title": "French-English Customer Care Representative",
                "company": "EQ Bank",
                "location": "Toronto, ON",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingual+customer+care+EQ+Bank",
                "description": "EQ Bank is looking for French-English Customer Care Representatives. Provide exceptional service via phone, email, and chat.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_3",
                "title": "Bilingual Contact Centre Representative",
                "company": "Rogers Communications",
                "location": "Toronto, ON",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingual+contact+centre+Rogers",
                "description": "Rogers is seeking Bilingual Contact Centre Representatives. Handle customer inquiries for wireless and internet services in French and English.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_4",
                "title": "Représentant(e) Service à la Clientèle Bilingue",
                "company": "Bell Canada",
                "location": "Montreal, QC",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingue+service+clientèle+Bell",
                "description": "Bell Canada recherche des représentants bilingues. Répondre aux appels en français et anglais, support technique pour Internet/TV.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_5",
                "title": "Bilingual Customer Experience Specialist",
                "company": "TELUS",
                "location": "Remote - Canada",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingual+customer+experience+TELUS",
                "description": "TELUS is looking for Bilingual Customer Experience Specialists. Work from home supporting wireless, internet, and TV customers.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_6",
                "title": "Bilingual Customer Sales and Service Agent",
                "company": "Air Canada",
                "location": "Montreal, QC",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingual+customer+service+Air+Canada",
                "description": "Air Canada is hiring Bilingual Customer Sales and Service Agents. Handle reservations, bookings, and customer inquiries.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_7",
                "title": "Bilingual Customer Support Agent",
                "company": "Shopify",
                "location": "Ottawa, ON",
                "country": "Canada",
                "job_url": "https://www.indeed.com/jobs?q=bilingual+customer+support+shopify",
                "description": "Shopify is hiring Bilingual Customer Support Agents. Help merchants succeed by providing support in French and English via chat and email.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
            {
                "job_id": "sample_8",
                "title": "Bilingual Customer Service Representative",
                "company": "RBC Royal Bank",
                "location": "Toronto, ON",
                "country": "Canada",
                "job_url": "https://www.linkedin.com/jobs/search/?keywords=bilingual+customer+service+RBC",
                "description": "RBC is hiring Bilingual Customer Service Representatives. Provide exceptional banking service in French and English.",
                "posted_date": datetime.utcnow().isoformat(),
                "employment_type": "Full-time",
                "source": "Sample Data"
            },
        ]

        return {
            "success": True,
            "jobs": sample_jobs,
            "total_found": len(sample_jobs),
            "query": query,
            "location": location,
            "source": "sample_data",
            "note": "Set RAPIDAPI_KEY for live job search. Get free key at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
        }

    def group_jobs_by_company(self, jobs: List[Dict]) -> Dict[str, List[Dict]]:
        """Group jobs by company name for aggregation"""
        grouped = {}
        for job in jobs:
            company = job.get("company", "Unknown")
            if company not in grouped:
                grouped[company] = []
            grouped[company].append(job)
        return grouped


# Singleton instance
_job_search_service: Optional[JobSearchService] = None


def get_job_search_service() -> JobSearchService:
    """Get or create the job search service singleton"""
    global _job_search_service
    if _job_search_service is None:
        _job_search_service = JobSearchService()
    return _job_search_service
