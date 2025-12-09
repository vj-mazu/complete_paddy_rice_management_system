# Final Two Critical Fixes

## Issue 1: Paddy Stock - Cleared Outturns Still Showing in Bifurcation

### Problem
After clearing an outturn, the next day's paddy stock bifurcation still showed that outturn with bags (e.g., 117 bags). This is wrong because once an outturn is cleared, those bags are consumed and should not appear in stock anymore.

### Solution
Filter out arrivals with cleared outturns from the paddy stock report.

### File Changed: `server/routes/records.js`

**Line ~361: Added `isCleared` and `clearedAt` to outturn attributes:**
```javascript
{ model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'isCleared', 'clearedAt'], required: false }
```

**After fetching rows, filter out cleared outturns:**
```javascript
// Filter out arrivals with cleared outturns (they should not appear in stock after clearing)
const filteredRows = rows.filter(arrival => {
  // If arrival has an outturn and it's cleared, exclude it from stock
  if (arrival.outturn && arrival.outturn.isCleared) {
    return false;
  }
  return true;
});
```

**Updated grouping and counts to use `filteredRows` instead of `rows`:**
```javascript
const groupedByDate = filteredRows.reduce((acc, arrival) => {
  // ...
}, {});

// In response:
totalRecords: filteredRows.length
recordsReturned: filteredRows.length
```

### Result
- ✅ Cleared outturns no longer appear in paddy stock bifurcation
- ✅ Next day's opening stock correctly excludes cleared outturns
- ✅ Stock calculations are accurate

## Issue 2: Rice Stock - Clearing Entry Should NOT Appear

### Problem
When clearing an outturn, the system creates a Bran entry with `locationCode: 'CLEARING'`. This entry was appearing in the Rice Stock report, which is wrong because it's waste/loss, not actual rice production.

### Solution
Exclude entries with `locationCode = 'CLEARING'` from the rice stock report.

### File Changed: `server/routes/rice-stock.js`

**Line ~16: Added filter to exclude clearing entries:**
```javascript
const where = {
  status: 'approved',
  locationCode: { [Op.ne]: 'CLEARING' } // Exclude clearing entries (waste/loss)
};
```

### Result
- ✅ Clearing entries (Bran with CLEARING location) no longer appear in Rice Stock
- ✅ Rice Stock only shows actual rice production
- ✅ Waste/loss is properly excluded from stock reports

## Complete Fix Summary

### Scenario: Clear outturn with 50 bags remaining

**Before Fixes:**
1. ❌ Paddy Stock: Next day still shows 117 bags for that outturn
2. ❌ Rice Stock: Shows Bran entry with 0 bags and CLEARING location
3. ❌ Confusing and incorrect stock reports

**After Fixes:**
1. ✅ Paddy Stock: Cleared outturn does NOT appear in bifurcation
2. ✅ Rice Stock: Clearing entry does NOT appear
3. ✅ Day transaction: Shows 50 bags consumed
4. ✅ Working section: Shows 50 bags added
5. ✅ All stock reports are accurate

## Files Changed

1. **server/routes/records.js** - Paddy Stock endpoint
   - Added `isCleared` to outturn attributes
   - Filter out cleared outturns from results
   - Update counts to use filtered results

2. **server/routes/rice-stock.js** - Rice Stock endpoint
   - Exclude entries with `locationCode = 'CLEARING'`

3. **server/routes/ledger.js** - Kunchinittu Ledger (for completeness)
   - Added `isCleared` to outturn attributes

## Testing

1. **Create and clear an outturn:**
   - Add 300 bags to outturn
   - Create rice production for 250 bags
   - Clear outturn (50 bags remaining)

2. **Check Paddy Stock (Records tab):**
   - ✅ Cleared outturn should NOT appear in bifurcation
   - ✅ Next day's opening stock should NOT include cleared outturn

3. **Check Rice Stock:**
   - ✅ Should NOT show Bran entry with CLEARING location
   - ✅ Should only show actual rice production entries

4. **Check Day Transaction:**
   - ✅ Should show 50 bags consumed on clearing date

5. **Check Working Section:**
   - ✅ Should show 50 bags added on clearing date

All checks should pass! The system now correctly handles cleared outturns in all reports.
