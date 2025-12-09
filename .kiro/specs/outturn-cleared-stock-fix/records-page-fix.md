# Records Page Fix - Outturn Report Tab

## Problem
In the **Records** page, under the **Outturn Report** tab, cleared outturns were still showing:
- "Available Bags for Production: 50 bags"
- "Remaining Bags: 50 bags"
- "Clear Outturn" button

This was confusing because the outturn was already cleared in the database.

## Root Cause
The Records page was using a DIFFERENT endpoint (`/available-bags`) than the OutturnReport page (`/available-paddy-bags`). This endpoint had the same bugs:
1. Using `bags` instead of `paddyBagsDeducted` for calculations
2. Not checking if the outturn is cleared

## Files Fixed

### 1. Backend: `server/routes/rice-productions.js`

**Endpoint:** `GET /outturn/:id/available-bags`

**Changes:**
1. Added check for `outturn.isCleared` flag
2. Returns zero bags with cleared status when outturn is cleared
3. Changed from `RiceProduction.sum('bags')` to `RiceProduction.sum('paddyBagsDeducted')`
4. Added `isCleared` flag to response

**Before:**
```javascript
const usedBags = await RiceProduction.sum('bags', {
  where: { outturnId: outturnId, status: { [Op.in]: ['pending', 'approved'] } }
}) || 0;

const availableBags = productionShiftingBags - usedBags;

res.json({ availableBags, totalBags: productionShiftingBags, usedBags });
```

**After:**
```javascript
// Check if outturn is cleared
const outturn = await Outturn.findByPk(outturnId);
if (outturn.isCleared) {
  return res.json({
    availableBags: 0,
    totalBags: 0,
    usedBags: 0,
    isCleared: true,
    clearedAt: outturn.clearedAt,
    remainingBags: outturn.remainingBags
  });
}

const usedBags = await RiceProduction.sum('paddyBagsDeducted', {
  where: { outturnId: outturnId, status: { [Op.in]: ['pending', 'approved'] } }
}) || 0;

const availableBags = productionShiftingBags - usedBags;

res.json({ 
  availableBags, 
  totalBags: productionShiftingBags, 
  usedBags,
  isCleared: false 
});
```

### 2. Frontend: `client/src/pages/Records.tsx`

**Changes:**
1. Added `isOutturnCleared` state variable
2. Updated `fetchAvailableBags` to set the cleared flag from API response
3. Added cleared outturn message
4. Hide "Clear Outturn" section when `isOutturnCleared = true`

**State Addition:**
```typescript
const [isOutturnCleared, setIsOutturnCleared] = useState<boolean>(false);
```

**API Response Handler:**
```typescript
const response = await axios.get<{ 
  availableBags: number;
  isCleared?: boolean;
  clearedAt?: string;
  remainingBags?: number;
}>(`/rice-productions/outturn/${selectedOutturnId}/available-bags`);
setAvailableBags(response.data.availableBags);
setIsOutturnCleared(response.data.isCleared || false);
```

**Cleared Message:**
```tsx
{isOutturnCleared && (
  <div style={{ 
    backgroundColor: '#fee2e2', 
    border: '2px solid #ef4444',
    color: '#991b1b'
  }}>
    ✅ This outturn has been cleared and closed. No more production entries can be added.
  </div>
)}
```

**Hide Clear Section:**
```tsx
{(user?.role === 'admin' || user?.role === 'manager') && availableBags > 0 && !isOutturnCleared && (
  <div>
    <div>Remaining Bags: {availableBags} bags</div>
    <button>Clear Outturn</button>
  </div>
)}
```

## Result

### Before Fix:
- ❌ Cleared outturns showed "50 bags available" in Records page
- ❌ "Clear Outturn" button was visible for already cleared outturns
- ❌ Clicking "Clear Outturn" showed error "Outturn already cleared"
- ❌ Calculation was wrong (using output rice bags instead of input paddy bags)

### After Fix:
- ✅ Cleared outturns show "This outturn has been cleared and closed"
- ✅ "Clear Outturn" section is hidden
- ✅ Calculation is correct (using paddy bags consumed)
- ✅ Available bags shows 0 for cleared outturns
- ✅ Clear visual indication that outturn is closed

## Testing

1. **Navigate to Records page → Outturn Report tab**
2. **Select a cleared outturn:**
   - Should show red message: "This outturn has been cleared and closed"
   - Should NOT show "Clear Outturn" section
   - Available bags should show 0

3. **Select a non-cleared outturn:**
   - Should show correct available bags (using paddy calculation)
   - Should show "Clear Outturn" section (if admin/manager)

## Complete Fix Summary

We've now fixed the cleared outturn issue in THREE places:

1. ✅ **OutturnReport.tsx page** - Uses `/available-paddy-bags` endpoint
2. ✅ **Records.tsx page (Outturn Report tab)** - Uses `/available-bags` endpoint
3. ✅ **Both backend endpoints** - Fixed to use `paddyBagsDeducted` and check `isCleared`

The system now correctly handles cleared outturns everywhere!
