"""
Scoring Service - Weighted signal scoring algorithm
Calculates company scores based on signal types, recency, and industry fit.
Supports configurable weights per project/campaign.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field


# Default signal type weights - can be overridden per project
DEFAULT_SIGNAL_WEIGHTS = {
    # Direct CX/Contact Center Signals (Highest Priority)
    "cx_leadership_hiring": 15,      # VP CX, Director Contact Center
    "bilingual_cx_hiring": 12,       # French/English, Spanish/English CSR
    "cx_expansion_hiring": 12,       # Multiple CX roles, new team
    "contact_center_hiring": 10,     # Contact center rep, CSR roles
    "bpo_mention": 10,               # Job mentions outsourcing, BPO

    # Operations & Support (High Priority)
    "offshore_expansion": 9,         # Offshore/nearshore mentions
    "vendor_management_hiring": 8,   # BPO vendor management roles
    "headcount_growth_high": 7,      # >30% employee growth

    # Customer Service General (Medium Priority)
    "customer_service_hiring": 6,    # General customer service roles
    "support_tech_hiring": 5,        # Support technology roles
    "expansion_news": 5,             # News about expansion

    # Growth & Funding (Lower Priority)
    "headcount_growth_medium": 4,    # 10-30% employee growth
    "funding_series_a_plus": 4,      # Series A or later
    "new_office": 4,                 # Opening new locations
    "ipo_preparation": 5,            # IPO news
    "funding_seed": 2,               # Seed funding

    # Catch-all
    "general_hiring": 1,
    "general_news": 1,
}

# Backwards compatibility alias
SIGNAL_WEIGHTS = DEFAULT_SIGNAL_WEIGHTS


# Pre-built weight presets for common campaign types
WEIGHT_PRESETS = {
    "bilingual_cx": {
        "name": "Bilingual CX Campaign",
        "description": "Prioritizes bilingual customer service roles (French/English, Spanish/English)",
        "weights": {
            "bilingual_cx_hiring": 15,
            "cx_leadership_hiring": 12,
            "contact_center_hiring": 10,
            "cx_expansion_hiring": 10,
            "customer_service_hiring": 8,
            "bpo_mention": 6,
        }
    },
    "bpo_outsourcing": {
        "name": "BPO/Outsourcing Campaign",
        "description": "Targets companies mentioning outsourcing, BPO, or vendor management",
        "weights": {
            "bpo_mention": 15,
            "vendor_management_hiring": 12,
            "offshore_expansion": 12,
            "cx_leadership_hiring": 10,
            "contact_center_hiring": 8,
            "bilingual_cx_hiring": 6,
        }
    },
    "contact_center": {
        "name": "Contact Center Campaign",
        "description": "Focuses on contact center and call center hiring signals",
        "weights": {
            "contact_center_hiring": 15,
            "cx_leadership_hiring": 12,
            "cx_expansion_hiring": 12,
            "bilingual_cx_hiring": 10,
            "customer_service_hiring": 8,
            "bpo_mention": 8,
        }
    },
    "growth_focused": {
        "name": "High-Growth Companies",
        "description": "Prioritizes companies showing rapid growth and funding signals",
        "weights": {
            "headcount_growth_high": 15,
            "funding_series_a_plus": 12,
            "ipo_preparation": 12,
            "cx_expansion_hiring": 10,
            "expansion_news": 10,
            "new_office": 8,
            "headcount_growth_medium": 6,
        }
    },
}


# Industry multipliers - some industries more likely to need BPO
INDUSTRY_MULTIPLIERS = {
    "telecommunications": 1.3,
    "telco": 1.3,
    "fintech": 1.2,
    "banking": 1.2,
    "financial services": 1.2,
    "insurance": 1.15,
    "e-commerce": 1.2,
    "ecommerce": 1.2,
    "retail": 1.1,
    "saas": 1.1,
    "software": 1.1,
    "utilities": 1.1,
    "media": 1.0,
    "healthcare": 1.0,
    "default": 1.0
}


# Keywords for signal classification
CX_LEADERSHIP_KEYWORDS = [
    "vp customer", "vice president customer", "director contact center",
    "head of cx", "head of customer", "chief customer officer", "cco",
    "director customer experience", "vp operations"
]

BILINGUAL_KEYWORDS = [
    "bilingual", "french english", "english french", "spanish english",
    "multilingual", "bilingue"
]

CONTACT_CENTER_KEYWORDS = [
    "contact center", "call center", "contact centre", "call centre"
]

CUSTOMER_SERVICE_KEYWORDS = [
    "customer service", "customer support", "csr", "customer care",
    "client service", "client support"
]

BPO_KEYWORDS = [
    "outsource", "outsourcing", "bpo", "offshore", "nearshore",
    "vendor management", "third party", "managed services"
]

EXPANSION_KEYWORDS = [
    "build", "scale", "grow", "expand", "new team", "greenfield",
    "hiring spree", "rapid growth", "scaling"
]


@dataclass
class ScoreBreakdown:
    """Detailed score breakdown by category"""
    total_score: int = 0
    cx_signals: float = 0.0
    growth_signals: float = 0.0
    funding_signals: float = 0.0
    news_signals: float = 0.0
    industry_bonus: float = 0.0
    signal_count: int = 0
    top_signals: List[Dict] = field(default_factory=list)


def get_merged_weights(custom_weights: Optional[Dict] = None) -> Dict:
    """
    Merge custom weights with defaults.
    Custom weights override defaults; unspecified signals use default values.
    """
    if not custom_weights:
        return DEFAULT_SIGNAL_WEIGHTS.copy()

    merged = DEFAULT_SIGNAL_WEIGHTS.copy()
    merged.update(custom_weights)
    return merged


def get_preset_weights(preset_name: str) -> Dict:
    """Get weights from a preset, merged with defaults"""
    if preset_name not in WEIGHT_PRESETS:
        return DEFAULT_SIGNAL_WEIGHTS.copy()

    preset = WEIGHT_PRESETS[preset_name]
    return get_merged_weights(preset.get("weights", {}))


def classify_job_signal(title: str, description: str = "") -> Tuple[str, int]:
    """
    Classify a job posting into signal type and strength.

    Returns:
        (signal_type, raw_strength) where strength is 1-5
    """
    title_lower = title.lower()
    desc_lower = (description or "").lower()
    combined = f"{title_lower} {desc_lower}"

    # CX Leadership (highest signal)
    if any(kw in title_lower for kw in CX_LEADERSHIP_KEYWORDS):
        return ("cx_leadership_hiring", 5)

    # BPO/Outsourcing mentions (very high signal)
    if any(kw in combined for kw in BPO_KEYWORDS):
        if any(kw in title_lower for kw in BPO_KEYWORDS):
            return ("bpo_mention", 5)
        return ("bpo_mention", 4)

    # Bilingual CX (high signal for Canadian market)
    if any(kw in combined for kw in BILINGUAL_KEYWORDS):
        if any(kw in combined for kw in CUSTOMER_SERVICE_KEYWORDS + CONTACT_CENTER_KEYWORDS):
            return ("bilingual_cx_hiring", 4)

    # Contact center specific
    if any(kw in title_lower for kw in CONTACT_CENTER_KEYWORDS):
        return ("contact_center_hiring", 3)

    # General customer service
    if any(kw in title_lower for kw in CUSTOMER_SERVICE_KEYWORDS):
        return ("customer_service_hiring", 2)

    # Check for expansion signals in description
    if any(kw in desc_lower for kw in EXPANSION_KEYWORDS):
        return ("cx_expansion_hiring", 3)

    return ("general_hiring", 1)


def classify_news_signal(title: str, content: str = "") -> Tuple[str, int]:
    """
    Classify a news article into signal type and strength.

    Returns:
        (signal_type, raw_strength) where strength is 1-5
    """
    combined = f"{title.lower()} {(content or '').lower()}"

    # Funding signals
    funding_keywords = ["raises", "funding", "series a", "series b", "series c",
                        "million", "billion", "investment", "investor"]
    ipo_keywords = ["ipo", "initial public offering", "public listing", "going public"]
    expansion_keywords = ["expands", "expansion", "new office", "new location",
                          "hiring", "headcount", "workforce"]

    if any(kw in combined for kw in ipo_keywords):
        return ("ipo_preparation", 5)

    if any(kw in combined for kw in funding_keywords):
        if "series a" in combined or "series b" in combined or "series c" in combined:
            return ("funding_series_a_plus", 4)
        return ("funding_seed", 2)

    if any(kw in combined for kw in expansion_keywords):
        return ("expansion_news", 3)

    return ("general_news", 1)


def calculate_signal_score(
    signal_type: str,
    raw_strength: int,
    weights: Optional[Dict] = None
) -> float:
    """
    Calculate weighted score for a single signal.

    Args:
        signal_type: The type of signal (e.g., "bilingual_cx_hiring")
        raw_strength: Raw signal strength (1-5)
        weights: Custom weight overrides

    Returns:
        Weighted score
    """
    active_weights = get_merged_weights(weights)
    base_weight = active_weights.get(signal_type, 1)
    return base_weight * raw_strength


def calculate_company_score(
    signals: List[Dict],
    industry: Optional[str] = None,
    weights: Optional[Dict] = None
) -> ScoreBreakdown:
    """
    Calculate total score for a company based on all its signals.

    Args:
        signals: List of signal dicts with 'signal_type' and 'signal_strength'
        industry: Company's industry for multiplier
        weights: Custom weight overrides

    Returns:
        ScoreBreakdown with detailed breakdown
    """
    breakdown = ScoreBreakdown()
    breakdown.signal_count = len(signals)

    if not signals:
        return breakdown

    # Get industry multiplier
    industry_mult = 1.0
    if industry:
        industry_lower = industry.lower()
        industry_mult = INDUSTRY_MULTIPLIERS.get(
            industry_lower,
            INDUSTRY_MULTIPLIERS.get("default", 1.0)
        )

    signal_scores = []
    cx_total = 0.0
    growth_total = 0.0
    funding_total = 0.0
    news_total = 0.0

    for signal in signals:
        signal_type = signal.get("signal_type", "general_hiring")
        strength = signal.get("signal_strength", 1)
        score = calculate_signal_score(signal_type, strength, weights)

        signal_scores.append({
            "signal_type": signal_type,
            "strength": strength,
            "score": score
        })

        # Categorize
        if signal_type in ["cx_leadership_hiring", "bilingual_cx_hiring",
                           "contact_center_hiring", "customer_service_hiring",
                           "bpo_mention", "cx_expansion_hiring"]:
            cx_total += score
        elif signal_type in ["headcount_growth_high", "headcount_growth_medium",
                             "expansion_news", "new_office"]:
            growth_total += score
        elif signal_type in ["funding_series_a_plus", "funding_seed", "ipo_preparation"]:
            funding_total += score
        else:
            news_total += score

    # Sort by score descending
    signal_scores.sort(key=lambda x: x["score"], reverse=True)

    raw_total = cx_total + growth_total + funding_total + news_total
    industry_bonus = raw_total * (industry_mult - 1.0)

    breakdown.total_score = int(raw_total * industry_mult)
    breakdown.cx_signals = cx_total
    breakdown.growth_signals = growth_total
    breakdown.funding_signals = funding_total
    breakdown.news_signals = news_total
    breakdown.industry_bonus = industry_bonus
    breakdown.top_signals = signal_scores[:5]  # Top 5 signals

    return breakdown


class ScoringService:
    """Service wrapper for scoring functions"""

    def __init__(self):
        self.weights = DEFAULT_SIGNAL_WEIGHTS.copy()

    def classify_job(self, title: str, description: str = "") -> Tuple[str, int]:
        """Classify a job posting"""
        return classify_job_signal(title, description)

    def classify_news(self, title: str, content: str = "") -> Tuple[str, int]:
        """Classify a news article"""
        return classify_news_signal(title, content)

    def score_company(
        self,
        signals: List[Dict],
        industry: Optional[str] = None,
        custom_weights: Optional[Dict] = None
    ) -> ScoreBreakdown:
        """Calculate company score"""
        weights = custom_weights or self.weights
        return calculate_company_score(signals, industry, weights)

    def get_presets(self) -> Dict:
        """Get available weight presets"""
        return WEIGHT_PRESETS


# Singleton instance
_scoring_service: Optional[ScoringService] = None


def get_scoring_service() -> ScoringService:
    """Get or create the scoring service singleton"""
    global _scoring_service
    if _scoring_service is None:
        _scoring_service = ScoringService()
    return _scoring_service
