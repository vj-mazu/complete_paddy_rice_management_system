# Design Document

## Overview

This design addresses the bug where cleared outturns continue to show available paddy bags in the stock management system. The fix involves modifying the available-paddy-bags endpoint to check the `isCleared` flag and return zero bags when an outurn is cleared, as well as adding validation to prevent rice production entries from being created for cleared outturns.

## Architecture

The solution involves changes to two main components:

1. **Available Paddy Bags Endpoint** (`GET /api/rice-productions/outturn/:id/available-paddy-bags`)
   - Add check for `isCleared` flag before calculating available bags
   - Return zero bags and cleared status information when outurn is cleared

2. **Rice Production Validation** (`POST /api/rice-productions` and `PUT /api/rice-productions/:id`)
   - Add validation to check if outurn is cleared before allowing creation/update
   - Return appropriate error message when attempting to use a cleared outurn

## Components and Interfaces

### 1. Available Paddy Bags Endpoint

**File:** `server/routes/rice-productions.js`

**Current Logic:**
```javascript
// Get total paddy bags
const totalPaddyBags = await Arrival.sum('bags', {...}) || 0;

// Get used bags
const usedBags = await RiceProduction.sum('bags', {...}) || 0;

// Calculate available
const availablePaddyBags = totalPaddyBags - usedBags;
```

**New Logic:**
```javascript
// First, check if outurn is cleared
const outturn = await Outturn.findByPk(outturnId);

if (outturn.isCleared) {
  return res.json({
    availablePaddyBags: 0,
    totalPaddyBags: 0,
    usedPaddyBags: 0,
    isCleared: true,
    clearedAt: outturn.clearedAt,
    remainingBags: outturn.remainingBags
  });
}

// Continue with existing calculation for non-cleared outturns
```

**Response Schema:**
```typescript
{
  availablePaddyBags: number;
  totalPaddyBags: number;
  usedPaddyBags: number;
  isCleared: boolean;
  clearedAt?: Date;
  remainingBags?: number;
}
```

### 2. Rice Production Creation Validation

**File:** `server/routes/rice-productions.js`

**Location:** In the `POST /` endpoint, after outturn ID resolution and before bag validation

**New Validation:**
```javascript
// Check if outurn is cleared
const outturn = await Outturn.findByPk(finalOutturnId);
if (!outturn) {
  return res.status(400).json({ error: 'Outturn not found' });
}

if (outturn.isCleared) {
  return res.status(400).json({ 
    error: `Cannot create rice production for cleared outurn ${outturn.code}. This outurn was cleared on ${outturn.clearedAt}.`,
    isCleared: true,
    clearedAt: outturn.clearedAt
  });
}
```

### 3. Rice Production Update Validation

**File:** `server/routes/rice-productions.js`

**Location:** In the `PUT /:id` endpoint, after outturn ID resolution (if outturnId is being changed)

**New Validation:**
```javascript
// If outturnId is being changed, check if new outurn is cleared
if (outturnId && outturnId !== production.outturnId) {
  const newOutturn = await Outturn.findByPk(outturnId);
  if (!newOutturn) {
    return res.status(400).json({ error: 'Outturn not found' });
  }
  
  if (newOutturn.isCleared) {
    return res.status(400).json({ 
      error: `Cannot update rice production to cleared outurn ${newOutturn.code}. This outurn was cleared on ${newOutturn.clearedAt}.`,
      isCleared: true,
      clearedAt: newOutturn.clearedAt
    });
  }
}
```

## Data Models

No changes to data models are required. The existing `Outturn` model already has the necessary fields:

- `isCleared` (BOOLEAN): Indicates if the outurn has been cleared
- `clearedAt` (DATE): Timestamp when the outurn was cleared
- `clearedBy` (INTEGER): User ID who cleared the outurn
- `remainingBags` (INTEGER): Number of bags that were remaining when cleared

## Error Handling

### Error Scenarios

1. **Attempting to create rice production for cleared outurn**
   - HTTP Status: 400 Bad Request
   - Error Message: "Cannot create rice production for cleared outurn {code}. This outurn was cleared on {date}."
   - Response includes: `isCleared: true`, `clearedAt: Date`

2. **Attempting to update rice production to reference cleared outurn**
   - HTTP Status: 400 Bad Request
   - Error Message: "Cannot update rice production to cleared outurn {code}. This outurn was cleared on {date}."
   - Response includes: `isCleared: true`, `clearedAt: Date`

3. **Querying available bags for non-existent outurn**
   - Existing error handling remains unchanged
   - HTTP Status: 500 Internal Server Error (current behavior)

## Testing Strategy

### Unit Tests (Optional)

1. **Available Paddy Bags Endpoint**
   - Test that cleared outturns return zero available bags
   - Test that cleared outturns include isCleared flag in response
   - Test that non-cleared outturns continue to work as before

2. **Rice Production Creation**
   - Test that creating production for cleared outurn returns 400 error
   - Test that creating production for non-cleared outurn works normally
   - Test error message includes cleared date and status

3. **Rice Production Update**
   - Test that updating to cleared outurn returns 400 error
   - Test that updating non-cleared outurn works normally
   - Test that updating other fields (not outturnId) works for any outurn

### Manual Testing

1. Create an outurn and add some paddy bags
2. Create rice production entries to consume some bags
3. Clear the outurn
4. Verify available-paddy-bags endpoint returns 0
5. Attempt to create new rice production entry - should fail
6. Check outurn report displays correctly

## Implementation Notes

1. **Performance Consideration**: The additional `Outturn.findByPk()` call adds one extra database query, but this is acceptable given the importance of data integrity

2. **Backward Compatibility**: The response schema is extended (not changed), so existing clients will continue to work. New clients can use the additional fields.

3. **Database Queries**: All queries use existing indexes on the `outturns` table (`id` primary key and `is_cleared` index)

4. **Transaction Safety**: No transaction changes needed as these are read operations for validation

## Design Decisions

### Decision 1: Return Zero vs Error for Cleared Outturns

**Chosen Approach**: Return zero available bags with cleared status information

**Rationale**: 
- The endpoint is used for display purposes in the UI
- Returning zero is semantically correct (there are no available bags)
- Including the cleared status allows the UI to show appropriate messaging
- This approach is less disruptive than returning an error

### Decision 2: Validate at Creation/Update vs Allow with Warning

**Chosen Approach**: Reject creation/update with error

**Rationale**:
- Prevents data integrity issues
- Cleared outturns should be immutable
- Clear error messages help users understand the issue
- Aligns with business logic (cleared = closed/finished)

### Decision 3: Check Cleared Status in Multiple Places

**Chosen Approach**: Add checks in both available-bags endpoint and production creation/update

**Rationale**:
- Defense in depth - multiple validation layers
- Available-bags check fixes the display issue
- Production validation prevents invalid data entry
- Each check serves a distinct purpose
