# Critical Fix: Paddy Bags Calculation Error

## The Major Bug Found

### Problem
The system was using **OUTPUT rice bags** instead of **INPUT paddy bags** when calculating available paddy bags. This caused massive errors in stock calculations.

### Example of the Bug:
- Total paddy bags: 300
- Rice production: 250 bags of rice (OUTPUT)
- Paddy consumed: 750 bags (INPUT - based on conversion ratio)
- **Wrong calculation**: 300 - 250 = **50 bags remaining** ❌
- **Correct calculation**: 300 - 750 = **-450 bags** (should have blocked this!) ✅

## Root Cause

The code was using `RiceProduction.sum('bags')` which sums the OUTPUT rice bags, instead of `RiceProduction.sum('paddyBagsDeducted')` which sums the INPUT paddy bags consumed.

## Files Fixed

### 1. `server/routes/outturns.js` - Clear Outturn Endpoint
**Before:**
```javascript
const usedBags = await RiceProduction.sum('bags', {
  where: { outturnId: id, status: { [Op.in]: ['pending', 'approved'] } }
}) || 0;
```

**After:**
```javascript
const usedBags = await RiceProduction.sum('paddyBagsDeducted', {
  where: { outturnId: id, status: { [Op.in]: ['pending', 'approved'] } }
}) || 0;
```

### 2. `server/routes/rice-productions.js` - Available Paddy Bags Endpoint
**Before:**
```javascript
const usedBags = await RiceProduction.sum('bags', {
  where: { outturnId: outturnId, status: { [Op.in]: ['pending', 'approved'] } }
}) || 0;
```

**After:**
```javascript
const usedBags = await RiceProduction.sum('paddyBagsDeducted', {
  where: { outturnId: outturnId, status: { [Op.in]: ['pending', 'approved'] } }
}) || 0;
```

### 3. `server/routes/rice-productions.js` - POST Validation
**Before:**
```javascript
if (bags > availablePaddyBags) {
  return res.status(400).json({ 
    error: `Insufficient paddy bags available. Available: ${availablePaddyBags} bags, Required: ${bags} bags`,
  });
}
```

**After:**
```javascript
if (paddyBagsDeducted > availablePaddyBags) {
  return res.status(400).json({ 
    error: `Insufficient paddy bags available. Available: ${availablePaddyBags} bags, Required: ${paddyBagsDeducted} bags`,
  });
}
```

### 4. `server/routes/rice-productions.js` - PUT Validation
Same fix as POST - changed from `bags` to `paddyBagsDeducted` in both the sum query and the validation check.

## Impact

### Before Fix:
- ❌ Available bags calculation was completely wrong
- ❌ Could create rice production entries that exceeded actual paddy stock
- ❌ Clearing outturns showed wrong remaining bags
- ❌ Stock reports were inaccurate
- ❌ Data integrity was compromised

### After Fix:
- ✅ Available bags correctly calculated using paddy bags consumed
- ✅ Validation prevents exceeding actual paddy stock
- ✅ Clearing outturns shows correct remaining bags
- ✅ Stock reports are accurate
- ✅ Data integrity is maintained

## Testing

To verify the fix:

1. **Check existing data:**
   - Look at outturns with rice production
   - Compare OUTPUT rice bags vs INPUT paddy bags consumed
   - Verify available bags calculation is now correct

2. **Test new production:**
   - Try to create rice production that would exceed paddy stock
   - Should be blocked with correct error message

3. **Test clearing:**
   - Clear an outturn
   - Verify remaining bags calculation is correct
   - Verify available bags shows 0 after clearing

## Critical Note

This was a **MAJOR BUG** that affected all stock calculations. The system was essentially comparing apples (rice bags) to oranges (paddy bags). This fix ensures we're always comparing paddy bags to paddy bags.

The conversion ratio is typically:
- 1 quintal of rice = ~3 quintals of paddy
- So 100 bags of rice output = ~300 bags of paddy input

The old code was treating 100 rice bags as if only 100 paddy bags were consumed, which is completely wrong!
