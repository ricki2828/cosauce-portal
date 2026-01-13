# Testing Team Leader Direct Submission

## Prerequisites

Before testing, ensure the following test data exists in the Azure database:

1. **Test Team Leader**:
   - Email: `test.teamleader@example.com`
   - Name: `Test Team Leader`
   - At least one assigned account

2. **Test Account**:
   - Must be assigned to the test team leader
   - Must have at least 2-3 metric definitions

3. **Portal User**:
   - Email matching the team leader email
   - Role: `team_leader`
   - `azure_team_leader_id` field populated (optional, for linking)

## Azure API Endpoint Tests

### 1. Test TeamLeader Lookup by Email

```bash
# Should return team leader profile with account_ids
curl https://daily-update-api.azurewebsites.net/api/team-leaders/by-email/test.teamleader@example.com

# Expected response:
{
  "id": "uuid-of-team-leader",
  "name": "Test Team Leader",
  "email": "test.teamleader@example.com",
  "account_ids": ["account-uuid-1", "account-uuid-2"]
}

# Test with non-existent email (should return 404):
curl https://daily-update-api.azurewebsites.net/api/team-leaders/by-email/nonexistent@example.com

# Expected response:
{"detail": "Team leader not found"}
```

### 2. Test Direct Submission

```bash
# Submit metrics for a date
curl -X POST https://daily-update-api.azurewebsites.net/api/updates/submit-for-date \
  -H "Content-Type: application/json" \
  -d '{
    "team_leader_id": "uuid-of-team-leader",
    "account_id": "account-uuid-1",
    "date": "2026-01-13",
    "metrics": [
      {
        "metric_definition_id": "metric-uuid-1",
        "value": 42
      },
      {
        "metric_definition_id": "metric-uuid-2",
        "value": "Yes"
      }
    ],
    "notes": "Test submission from API testing"
  }'

# Expected response: DailyUpdateDetailResponse with full metrics
# Status: 200 OK

# Test duplicate submission (should return 400):
curl -X POST https://daily-update-api.azurewebsites.net/api/updates/submit-for-date \
  -H "Content-Type: application/json" \
  -d '{ ... same payload ... }'

# Expected response:
{"detail": "Already submitted for this date"}

# Test unauthorized account access (should return 403):
curl -X POST https://daily-update-api.azurewebsites.net/api/updates/submit-for-date \
  -H "Content-Type: application/json" \
  -d '{
    "team_leader_id": "uuid-of-team-leader",
    "account_id": "unauthorized-account-uuid",
    ...
  }'

# Expected response:
{"detail": "Not authorized for this account"}
```

## Portal Backend Endpoint Tests

### 1. Test Team Leader Profile Endpoint

```bash
# Login as team leader user first
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test.teamleader@example.com", "password": "password"}' \
  | jq -r '.access_token')

# Get team leader profile (proxies to Azure)
curl http://localhost:8004/api/business-updates/me/team-leader-profile \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "id": "uuid-of-team-leader",
  "name": "Test Team Leader",
  "email": "test.teamleader@example.com",
  "account_ids": ["account-uuid-1", "account-uuid-2"]
}
```

### 2. Test Submit Update Endpoint

```bash
# Submit update through portal (proxies to Azure)
curl -X POST http://localhost:8004/api/business-updates/submit-update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_leader_id": "uuid-of-team-leader",
    "account_id": "account-uuid-1",
    "date": "2026-01-13",
    "metrics": [
      {
        "metric_definition_id": "metric-uuid-1",
        "value": 42
      }
    ],
    "notes": "Test from portal"
  }'

# Expected response: DailyUpdateDetailResponse
```

## End-to-End Frontend Testing

### 1. Team Leader Login

1. Navigate to https://cosauce-portal.vercel.app
2. Login with team leader credentials:
   - Email: `test.teamleader@example.com`
   - Password: `password`
3. Verify successful login and user.role === 'team_leader'

### 2. Navigate to Business Updates

1. Click on "Business Updates" in the sidebar
2. Verify the page loads with tabs visible
3. Click on "Shift Reporting" tab
4. Verify SubmitUpdate component renders (not ShiftReporting)

### 3. Test Profile Loading

1. Verify loading spinner appears initially
2. Verify profile loads successfully
3. Check browser console for any errors
4. Verify account dropdown populates with team leader's accounts
5. If only one account, verify it's auto-selected

### 4. Test Account Selection

1. Select an account from dropdown
2. Verify metrics form appears
3. Verify correct metrics load for the selected account
4. Verify each metric has the correct input type:
   - Number metrics: number input
   - Percentage metrics: number input with 0-100 placeholder
   - Boolean metrics: Yes/No select
   - Text metrics: text input

### 5. Test Form Submission

1. Fill in all required metrics (marked with red asterisk)
2. Optionally fill in notes
3. Click "Submit Update" button
4. Verify:
   - Button shows "Submitting..." during submission
   - No console errors
   - Success message appears after submission
   - Success message shows green checkmark icon
   - Form resets after 3 seconds

### 6. Test Error Handling

1. Try submitting without filling required fields
2. Try submitting twice for same date (should fail with error message)
3. Verify error messages display in red alert box
4. Verify form doesn't reset on error

### 7. Test Different Accounts

1. Change account selection
2. Verify metrics update to match new account
3. Fill and submit for different account
4. Verify successful submission

## Database Verification

After successful submission, verify in Azure database:

```sql
-- Check DailyUpdate record was created
SELECT * FROM daily_updates
WHERE team_leader_id = 'uuid-of-team-leader'
  AND date = '2026-01-13';

-- Check MetricValue records were created
SELECT mv.*, md.name, md.data_type
FROM metric_values mv
JOIN metric_definitions md ON mv.metric_definition_id = md.id
WHERE mv.daily_update_id = 'update-uuid';

-- Verify status is 'submitted' and submitted_at is set
SELECT status, submitted_at, notes
FROM daily_updates
WHERE id = 'update-uuid';
```

## Rollback Testing

Test that portal gracefully handles Azure API failures:

1. Stop Azure backend temporarily
2. Attempt to load profile (should show error message)
3. Restart Azure backend
4. Verify profile loads successfully on retry

## Security Testing

1. **Role-based access**:
   - Login as non-team_leader user (admin/director/viewer)
   - Navigate to Business Updates > Shift Reporting
   - Verify ShiftReporting component renders, not SubmitUpdate

2. **Account authorization**:
   - Manually craft request with unauthorized account_id
   - Verify 403 Forbidden response

3. **Authentication required**:
   - Access endpoints without Bearer token
   - Verify 401 Unauthorized response

## Performance Testing

1. Test with team leader assigned to 10+ accounts
2. Test with account having 20+ metrics
3. Verify page loads within 3 seconds
4. Verify no memory leaks on repeated submissions

## Test Checklist

- [ ] Azure `/by-email/{email}` endpoint returns correct data
- [ ] Azure `/submit-for-date` endpoint creates DailyUpdate
- [ ] Portal `/me/team-leader-profile` proxies correctly
- [ ] Portal `/submit-update` proxies correctly
- [ ] Team leader can login successfully
- [ ] SubmitUpdate component renders for team_leader role
- [ ] ShiftReporting component renders for other roles
- [ ] Profile loads with accounts
- [ ] Metrics load for selected account
- [ ] Form submission works
- [ ] Duplicate submission prevented
- [ ] Error messages display correctly
- [ ] Success message appears and form resets
- [ ] Database records created correctly
- [ ] Role-based access control enforced
- [ ] Account authorization enforced
