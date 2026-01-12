"""
Apollo.io API Integration for Contact Enrichment
Finds decision makers at target companies

API Documentation: https://apolloio.github.io/apollo-api-docs/
"""
import os
from typing import Optional, List, Dict
from dataclasses import dataclass
from datetime import datetime

import httpx


@dataclass
class ApolloContact:
    """Contact data from Apollo"""
    apollo_id: str
    first_name: str
    last_name: str
    full_name: str
    title: str
    email: Optional[str] = None
    email_status: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    seniority: Optional[str] = None
    department: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    revealed: bool = False


@dataclass
class ApolloOrganization:
    """Organization data from Apollo"""
    apollo_id: str
    name: str
    domain: str
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    employee_growth: Optional[float] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    founded_year: Optional[int] = None


class ApolloService:
    """Service for Apollo.io API integration"""

    BASE_URL = "https://api.apollo.io/api/v1"

    # Target titles for BPO sales
    TARGET_TITLES = [
        "VP Customer Experience",
        "VP Customer Service",
        "VP Operations",
        "Head of Customer Experience",
        "Head of Customer Service",
        "Head of Operations",
        "Director Customer Experience",
        "Director Customer Service",
        "Director Contact Center",
        "Director Call Center",
        "Director Operations",
        "Chief Customer Officer",
        "Chief Operating Officer",
        "Contact Center Manager",
        "Call Center Manager",
        "Customer Service Manager",
    ]

    TARGET_SENIORITIES = ["director", "vp", "c_suite", "manager"]

    def __init__(self):
        self.api_key = os.getenv("APOLLO_API_KEY", "")
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy-load the HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "x-api-key": self.api_key
                },
                timeout=30.0
            )
        return self._client

    def is_configured(self) -> bool:
        """Check if Apollo API key is configured"""
        return bool(self.api_key)

    async def search_contacts(
        self,
        domain: str,
        company_name: Optional[str] = None,
        titles: Optional[List[str]] = None,
        seniority: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[ApolloContact]:
        """
        Search for contacts at a company by domain

        Args:
            domain: Company domain (e.g., stripe.com)
            company_name: Optional company name for fallback
            titles: Job titles to search for (defaults to CX/Ops titles)
            seniority: Seniority levels (e.g., ["director", "vp", "c_suite"])
            limit: Max contacts to return

        Returns:
            List of ApolloContact (names may be partially obfuscated until revealed)
        """
        if not self.is_configured():
            # Return placeholder contacts when no API key
            return self._get_sample_contacts(domain, company_name or domain, limit)

        if titles is None:
            titles = self.TARGET_TITLES

        if seniority is None:
            seniority = self.TARGET_SENIORITIES

        payload = {
            "q_organization_domains_list": [domain],
            "person_titles": titles,
            "person_seniorities": seniority,
            "page": 1,
            "per_page": limit
        }

        try:
            response = await self.client.post(
                f"{self.BASE_URL}/mixed_people/api_search",
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            contacts = []
            for person in data.get("people", []):
                contact = self._parse_person(person)
                if contact:
                    contacts.append(contact)

            return contacts

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ValueError("Invalid Apollo API key")
            elif e.response.status_code == 429:
                raise ValueError("Apollo API rate limit exceeded")
            else:
                raise ValueError(f"Apollo API error: {e.response.status_code}")
        except Exception as e:
            # Fallback to sample data on error
            return self._get_sample_contacts(domain, company_name or domain, limit)

    async def get_organization(self, domain: str) -> Optional[ApolloOrganization]:
        """
        Get organization details by domain

        Args:
            domain: Company domain

        Returns:
            ApolloOrganization data
        """
        if not self.is_configured():
            return None

        payload = {
            "domain": domain
        }

        try:
            response = await self.client.post(
                f"{self.BASE_URL}/organizations/enrich",
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            org = data.get("organization")
            if org:
                # Calculate employee growth from employee ranges if available
                employee_growth = None
                if org.get("estimated_num_employees"):
                    # Apollo provides employee range changes like "50-200" -> "200-500"
                    # We can estimate growth percentage if we have historical data
                    # For now, leave as None since Apollo doesn't provide direct growth rate
                    pass

                return ApolloOrganization(
                    apollo_id=org.get("id", ""),
                    name=org.get("name", ""),
                    domain=org.get("primary_domain", domain),
                    industry=org.get("industry"),
                    employee_count=org.get("estimated_num_employees"),
                    employee_growth=employee_growth,  # Apollo doesn't provide growth rate directly
                    linkedin_url=org.get("linkedin_url"),
                    website_url=org.get("website_url"),
                    city=org.get("city"),
                    state=org.get("state"),
                    country=org.get("country"),
                    founded_year=org.get("founded_year"),
                )

        except Exception as e:
            print(f"Error enriching organization: {e}")

        return None

    async def reveal_contact(self, apollo_id: str) -> Optional[Dict]:
        """
        Reveal full contact details using Apollo credits.

        Args:
            apollo_id: Apollo person ID

        Returns:
            Dict with full contact details including email
        """
        if not self.is_configured():
            raise ValueError("Apollo API key required to reveal contacts")

        payload = {
            "id": apollo_id,
            "reveal_personal_emails": True,
            "reveal_phone_number": True
        }

        try:
            response = await self.client.post(
                f"{self.BASE_URL}/people/match",
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            person = data.get("person")
            if person:
                phones = person.get("phone_numbers", [])
                return {
                    "apollo_id": person.get("id"),
                    "first_name": person.get("first_name"),
                    "last_name": person.get("last_name"),
                    "full_name": person.get("name"),
                    "title": person.get("title"),
                    "email": person.get("email"),
                    "email_status": person.get("email_status"),
                    "phone": phones[0].get("sanitized_number") if phones else None,
                    "linkedin_url": person.get("linkedin_url"),
                    "company_name": person.get("organization", {}).get("name"),
                    "city": person.get("city"),
                    "state": person.get("state"),
                    "country": person.get("country"),
                    "revealed": True
                }

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 402:
                raise ValueError("Insufficient Apollo credits - please add credits to reveal contacts")
            raise ValueError(f"Apollo API error: {e.response.status_code}")
        except Exception as e:
            raise ValueError(f"Error revealing contact: {str(e)}")

        return None

    def _parse_person(self, person: Dict) -> Optional[ApolloContact]:
        """Parse person data from Apollo API response"""
        if not person:
            return None

        org = person.get("organization", {}) or {}

        return ApolloContact(
            apollo_id=person.get("id", ""),
            first_name=person.get("first_name", ""),
            last_name=person.get("last_name", ""),
            full_name=person.get("name", ""),
            title=person.get("title", ""),
            email=person.get("email"),
            email_status=person.get("email_status"),
            phone=None,  # Not available in search, only after reveal
            linkedin_url=person.get("linkedin_url"),
            seniority=person.get("seniority"),
            department=person.get("department"),
            company_name=org.get("name"),
            company_domain=org.get("primary_domain"),
            city=person.get("city"),
            state=person.get("state"),
            country=person.get("country"),
            revealed=False
        )

    def _get_sample_contacts(
        self,
        domain: str,
        company_name: str,
        limit: int
    ) -> List[ApolloContact]:
        """Return sample placeholder contacts when API key not configured"""
        sample_titles = [
            ("VP Customer Experience", "vp"),
            ("Director Contact Center", "director"),
            ("Head of Customer Service", "director"),
            ("Customer Service Manager", "manager"),
            ("VP Operations", "vp"),
        ]

        contacts = []
        for i, (title, seniority) in enumerate(sample_titles[:limit]):
            contacts.append(ApolloContact(
                apollo_id=f"sample_{domain}_{i}",
                first_name="[Reveal]",
                last_name="[Required]",
                full_name="[Reveal Required]",
                title=title,
                email=None,
                email_status="pending",
                linkedin_url=None,
                seniority=seniority,
                department="Operations",
                company_name=company_name,
                company_domain=domain,
                revealed=False
            ))

        return contacts

    async def close(self):
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
_apollo_service: Optional[ApolloService] = None


async def get_apollo_service() -> ApolloService:
    """Get or create the Apollo service singleton"""
    global _apollo_service
    if _apollo_service is None:
        _apollo_service = ApolloService()
    return _apollo_service
