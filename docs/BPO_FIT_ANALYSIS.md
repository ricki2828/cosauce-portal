# BPO Fit Analysis System

**Last Updated**: 2026-01-08

## Overview

The BPO Fit Analysis system evaluates companies in the sales pipeline to determine their likelihood of outsourcing customer experience operations to CoSauce. The system uses a combination of pre-check heuristics and AI analysis (OpenAI GPT-4o-mini) to assign fit levels.

## Fit Levels

The system uses a 4-tier hierarchy:

| Level | Description | Badge Color | Sort Priority |
|-------|-------------|-------------|---------------|
| **HIGH** | Ideal BPO fit - SaaS, E-commerce, FinTech | Green (quaternary) | 3 (highest) |
| **MEDIUM** | Moderate fit - Traditional tech, Insurance | Yellow (tertiary) | 2 |
| **LOW** | Poor fit but still a prospect | Gray (muted) | 1 |
| **DISQUALIFIED** | Competitor/adjacent service - will NEVER outsource | Red (secondary) | 0 (lowest) |

### Why DISQUALIFIED Was Added

**Problem**: Companies with industry "Business Process Outsourcing" or "Recruitment" were receiving LOW fit instead of being properly identified as competitors.

**Root Cause**:
- Pre-check logic only examined company NAME for disqualifying keywords
- The INDUSTRY field (populated by OpenAI enrichment) was not being checked
- No visual distinction between poor prospects (LOW) and competitors (should never pursue)

**Solution**: Added DISQUALIFIED as a fourth level with industry-based detection.

## Analysis Flow

```
1. Company enters pipeline via job scan
   ↓
2. OpenAI enrichment populates industry/size fields
   ↓
3. User triggers BPO fit analysis
   ↓
4. PRE-CHECK: Check company name for disqualifying keywords
   → Match found? Return DISQUALIFIED (skip AI analysis)
   ↓
5. PRE-CHECK: Check company industry for disqualifying patterns
   → Match found? Return DISQUALIFIED (skip AI analysis)
   ↓
6. AI ANALYSIS: Send company data to OpenAI GPT-4o-mini
   → Returns: fit_level, signals, reasoning
   ↓
7. Save analysis to database
   ↓
8. Display badge in UI (color-coded by fit level)
```

## Implementation Details

### Backend Pre-Check Logic

**Location**: `backend/app/services/sales_service.py` (lines 2068-2129)

**Stage 1: Name-Based Disqualification**
```python
disqualifying_keywords = [
    "recruit", "headhunt", "staffing", "talent acquisition",
    "bpo", "business process outsourcing", "offshore", "nearshore",
    "consulting", "consultancy", "advisory", "hr services"
]

# Check company name
company_name_lower = company.name.lower()
for keyword in disqualifying_keywords:
    if keyword in company_name_lower:
        return {
            "fit_level": "DISQUALIFIED",
            "signals": [f"Company name contains '{keyword}'"],
            "reasoning": "DISQUALIFIED: Company name indicates competitor..."
        }
```

**Stage 2: Industry-Based Disqualification** *(Added 2026-01-08)*
```python
disqualifying_industries = [
    "business process outsourcing", "bpo", "outsourcing",
    "recruitment", "staffing", "human resources",
    "consulting", "hr services", "talent acquisition",
    "headhunting", "executive search"
]

# Check company industry field
company_industry = (company.industry or "").lower()
if company_industry:
    for keyword in disqualifying_industries:
        if keyword in company_industry:
            return {
                "fit_level": "DISQUALIFIED",
                "signals": [f"Industry '{company.industry}' indicates competitor"],
                "reasoning": "DISQUALIFIED: Company operates in competitor industry..."
            }
```

### OpenAI Prompt

**Location**: `backend/app/services/sales_service.py` (lines 1956-2045)

**Key Instructions**:
```
⛔ IMMEDIATE DISQUALIFICATION - ZERO FIT (rate as DISQUALIFIED):
- BPO providers (Teleperformance, TTEC, Concentrix, etc.)
- Recruitment/staffing agencies
- HR consulting firms
- Any company that provides similar services to what we offer

RATING DECISION TREE:
1. Check industry/description for disqualifying keywords → DISQUALIFIED (stop)
2. Check if HIGH FIT industry + right size (200-5K) → HIGH
3. Check if MEDIUM FIT industry OR borderline size → MEDIUM
4. Everything else → LOW
```

**JSON Schema**:
```json
{
    "fit_level": "HIGH" | "MEDIUM" | "LOW" | "DISQUALIFIED",
    "signals": ["Industry: SaaS", "Size: 1,200 employees", "..."],
    "reasoning": "2-3 sentence explanation..."
}
```

### Frontend Type System

**Location**: `frontend/src/lib/api.ts` (line 79)

```typescript
export interface BPOAnalysis {
  fit_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'DISQUALIFIED';
  signals: string[];
  reasoning: string;
  analyzed_at: string;
}
```

### UI Badge Styling

**CompanyTable**: `frontend/src/components/sales/CompanyTable.tsx` (lines 150-159)

**CompanySlideOut**: `frontend/src/components/sales/CompanySlideOut.tsx` (lines 243-252)

```tsx
className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-heading font-bold border-2 ${
  company.bpo_analysis.fit_level === 'HIGH'
    ? 'bg-quaternary/20 text-quaternary border-quaternary/50'     // Green
    : company.bpo_analysis.fit_level === 'MEDIUM'
    ? 'bg-tertiary/20 text-tertiary border-tertiary/50'           // Yellow
    : company.bpo_analysis.fit_level === 'DISQUALIFIED'
    ? 'bg-secondary/20 text-secondary border-secondary/50'        // Red
    : 'bg-muted text-mutedForeground border-border'               // Gray (LOW)
}`}
```

### Sorting Logic

**Location**: `frontend/src/pages/Sales.tsx` (lines 65-86)

Companies are sorted by:
1. **Competitor status first**: `status === 'competitor'` companies go to bottom
2. **BPO fit level**: `HIGH (3) > MEDIUM (2) > LOW (1) > DISQUALIFIED (0)`
3. **Recency**: Most recently updated companies appear first within each tier

```typescript
const fitOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, DISQUALIFIED: 0 };
const aFit = a.bpo_analysis?.fit_level ? fitOrder[a.bpo_analysis.fit_level] || 0 : 0;
const bFit = b.bpo_analysis?.fit_level ? fitOrder[b.bpo_analysis.fit_level] || 0 : 0;

if (aFit !== bFit) {
  return bFit - aFit; // Higher fit first
}
```

## Database Schema

**Table**: `companies`

| Column | Type | Description |
|--------|------|-------------|
| `industry` | TEXT | Populated by OpenAI enrichment during job scan |
| `bpo_analysis` | JSON | Stores fit_level, signals, reasoning, analyzed_at |

**Example BPO Analysis JSON**:
```json
{
  "fit_level": "DISQUALIFIED",
  "signals": [
    "Industry 'Business Process Outsourcing' indicates competitor/adjacent service"
  ],
  "reasoning": "DISQUALIFIED: Company operates in 'Business Process Outsourcing' industry - direct competitor or adjacent service provider. These companies will NEVER outsource to us as they provide similar services themselves.",
  "analyzed_at": "2026-01-08T15:30:00.000000"
}
```

## API Endpoints

### Analyze Single Company
```bash
POST /api/sales/companies/{company_id}/analyze-bpo
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "fit_level": "DISQUALIFIED",
    "signals": ["Industry 'Recruitment' indicates competitor"],
    "reasoning": "DISQUALIFIED: Company operates in recruitment...",
    "analyzed_at": "2026-01-08T15:30:00.000000"
  }
}
```

### Bulk Analyze (with streaming progress)
```bash
POST /api/sales/bulk/analyze-bpo-stream
Content-Type: application/json

{
  "company_ids": ["uuid1", "uuid2", ...]
}
```

**Response**: Server-Sent Events (SSE) stream
```
data: {"processed": 1, "total": 10, "current_company": "Acme Corp", ...}
data: {"processed": 2, "total": 10, "current_company": "TechCo", ...}
...
data: {"done": true, "processed": 10, "total": 10, "success_count": 10, ...}
```

## Testing

### Manual Testing Checklist

1. **Industry-based disqualification**:
   - Create/scan a company with industry "Business Process Outsourcing"
   - Run BPO fit analysis
   - ✅ Should see RED "DISQUALIFIED" badge (not gray "LOW")
   - ✅ Company should rank at bottom of table

2. **Name-based disqualification**:
   - Create company named "Acme Recruitment Services"
   - Run BPO fit analysis
   - ✅ Should see RED "DISQUALIFIED" badge

3. **Sorting verification**:
   - Create companies with all 4 fit levels: HIGH, MEDIUM, LOW, DISQUALIFIED
   - ✅ Should sort: HIGH → MEDIUM → LOW → DISQUALIFIED

4. **Visual styling**:
   - ✅ HIGH badge should be green (quaternary)
   - ✅ MEDIUM badge should be yellow (tertiary)
   - ✅ LOW badge should be gray (muted)
   - ✅ DISQUALIFIED badge should be red (secondary)

### Test Companies

Example companies that should trigger DISQUALIFIED:

| Company Name | Industry | Expected Result |
|--------------|----------|-----------------|
| Concentrix Corp | Business Process Outsourcing | DISQUALIFIED (industry) |
| Robert Half International | Staffing and Recruiting | DISQUALIFIED (industry) |
| Korn Ferry | Human Resources | DISQUALIFIED (industry) |
| McKinsey & Company | Management Consulting Services | DISQUALIFIED (industry) |
| Randstad Recruitment Agency | Recruitment | DISQUALIFIED (name + industry) |

## Performance

**Pre-Check Benefits**:
- Skips expensive OpenAI API call for obvious competitors (~$0.0001 saved per company)
- Instant response (<10ms) vs AI analysis (~2-3 seconds)
- Reduces API costs for bulk operations (e.g., analyzing 100 BPO companies = $0.01 saved)

**Typical Analysis Times**:
- Pre-check disqualification: <10ms
- OpenAI analysis: 2-3 seconds
- Bulk operation (100 companies, 80% disqualified): ~40 seconds (vs ~5 minutes without pre-check)

## Configuration

### Modifying Disqualifying Keywords

Edit `backend/app/services/sales_service.py`:

```python
# Lines 2068-2080: Name-based keywords
disqualifying_keywords = [
    "recruit", "headhunt", "staffing",
    # Add more here...
]

# Lines 2095-2105: Industry-based keywords
disqualifying_industries = [
    "business process outsourcing", "bpo",
    # Add more here...
]
```

**After changes**:
1. Restart backend: `pkill -f "python.*8004" && cd ~/cosauce-portal/backend && python run.py &`
2. No frontend changes needed (type system already supports DISQUALIFIED)

## Troubleshooting

### Issue: Company not being disqualified despite matching industry

**Check**:
1. Is `company.industry` field populated? (requires OpenAI enrichment during job scan)
2. Is keyword exact match? (use lowercase, check for variations like "Business Process Outsourcing" vs "BPO")
3. Check backend logs: `tail -50 /tmp/cosauce-backend.log`

### Issue: DISQUALIFIED badge showing wrong color

**Check**:
1. Clear browser cache and hard refresh (Cmd/Ctrl+Shift+R)
2. Verify Vercel deployment succeeded: https://cosauce-portal.vercel.app
3. Check browser console for TypeScript errors

### Issue: DISQUALIFIED companies not sorting to bottom

**Check**:
1. Verify `fitOrder` includes DISQUALIFIED: `{ HIGH: 3, MEDIUM: 2, LOW: 1, DISQUALIFIED: 0 }`
2. Check if company has `status === 'competitor'` (takes precedence)

## Related Documentation

- **Job Scanning**: See `docs/JOB_SCANNING.md` for how companies are discovered
- **OpenAI Enrichment**: See `docs/OPENAI_ENRICHMENT.md` for how industry field is populated
- **Sales Pipeline**: See `docs/SALES_PIPELINE.md` for overall workflow

## Changelog

### 2026-01-08: DISQUALIFIED Fit Level Added
- Added industry-based disqualification check
- Updated OpenAI prompt to return DISQUALIFIED
- Added red badge UI styling
- Updated sorting logic to rank DISQUALIFIED at bottom
- Added documentation

### 2026-01-03: Initial BPO Fit Analysis
- Name-based disqualification check
- OpenAI GPT-4o-mini integration
- Three fit levels: HIGH, MEDIUM, LOW
- Badge UI with color coding
