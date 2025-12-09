# Paddy Hamali Integration Guide

## Current Status

The NEW Paddy Hamali system (12 work types) is implemented in:
- ✅ Backend API (fully functional)
- ✅ Locations → Hamali tab (configuration UI)

The OLD hamali system (4 work types) is still being used in:
- ❌ Records page "Add Hamali" button
- ❌ All Arrivals page

## What Needs to Be Done

### 1. Create AddPaddyHamaliModal Component

Create `client/src/components/AddPaddyHamaliModal.tsx`:

```typescript
// Modal that shows:
// - Dropdown to select work type
// - Radio buttons for work types with multiple options
// - Bags input (pre-filled from arrival, editable for Loose Tumbiddu)
// - Rate display (read-only, from selected work type)
// - Amount calculation (Rate × Bags)
// - Save/Cancel buttons

// On Save:
// - POST to /api/paddy-hamali-entries
// - Auto-approved for Manager/Admin
// - Pending approval for Staff
```

### 2. Update Records Page

In `client/src/pages/Records.tsx`:

**Replace the old hamali display with:**
```typescript
// Import AddPaddyHamaliModal
import AddPaddyHamaliModal from '../components/AddPaddyHamaliModal';

// When "Add Hamali" button clicked:
// - Open AddPaddyHamaliModal
// - Pass arrival/record data
// - On save, refresh hamali entries

// Display hamali entries:
// - Fetch from /api/paddy-hamali-entries/arrival/:arrivalId
// - Show: Work Type, Work Detail, Bags, Rate, Amount, Status
// - Show Edit button (if user can edit)
// - Show Approve button (if Manager/Admin and status is pending)
// - Show total hamali amount
```

### 3. Update All Arrivals Page

Similar changes to All Arrivals page.

## API Endpoints to Use

### Get Hamali Rates
```
GET /api/paddy-hamali-rates
Response: { rates: PaddyHamaliRate[] }
```

### Create Hamali Entry
```
POST /api/paddy-hamali-entries
Body: {
  arrivalId: number,
  workType: string,
  workDetail: string,
  rate: number,
  bags: number
}
Response: { entry: PaddyHamaliEntry, autoApproved: boolean }
```

### Get Entries for Arrival
```
GET /api/paddy-hamali-entries/arrival/:arrivalId
Response: { entries: PaddyHamaliEntry[], total: number }
```

### Update Entry
```
PUT /api/paddy-hamali-entries/:id
Body: { workType, workDetail, rate, bags }
```

### Approve Entry
```
PUT /api/paddy-hamali-entries/:id/approve
```

### Delete Entry
```
DELETE /api/paddy-hamali-entries/:id
```

## Quick Implementation Steps

1. **Create AddPaddyHamaliModal.tsx** (2-3 hours)
   - Fetch rates on mount
   - Group by work type
   - Show radio buttons for multiple options
   - Calculate amount on change
   - Submit to API

2. **Update Records.tsx** (1-2 hours)
   - Replace old hamali code
   - Use new modal
   - Display new entries format

3. **Test** (1 hour)
   - Add hamali as different roles
   - Verify auto-approval
   - Test edit/delete
   - Check calculations

## Total Estimated Time: 4-6 hours

## Files to Modify

- `client/src/components/AddPaddyHamaliModal.tsx` (NEW)
- `client/src/pages/Records.tsx` (UPDATE)
- `client/src/pages/AllArrivals.tsx` (UPDATE - if exists)

## Notes

- The backend is 100% ready
- All API endpoints are functional
- Role-based approval is working
- Just need to connect the frontend UI
