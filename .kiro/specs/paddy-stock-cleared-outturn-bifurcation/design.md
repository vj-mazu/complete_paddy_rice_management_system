# Design Document

## Overview

This design addresses the bug where cleared outturns continue to appear in the opening stock bifurcation on subsequent days in the Paddy Stock tab. The root cause is that the cleared outturn filtering logic is only applied to closing stock, but not to opening stock. Since opening stock is derived from the previous day's closing stock, the filter must be applied consistently to both.

## Architecture

### Current Implementation

The Paddy Stock tab in `client/src/pages/Records.tsx` processes stock data day by day:

1. **Opening Stock Calculation**: Copies the previous day's closing stock (lines ~3000-3100)
   - `openingStockByKey` - Regular kunchinittu stock
   - `openingProductionShifting` - Production shifting stock (outturns)

2. **Closing Stock Calculation**: Processes the day's transactions and applies filters (lines ~3100-3160)
   - Deducts rice production from production shifting stock
   - **Filters cleared outturns** (lines 3137-3154) - THIS IS THE KEY LOGIC
   - Calculates final closing stock

3. **Problem**: The cleared outturn filter is only applied to closing stock, not opening stock

### Root Cause

When Day N's closing stock is calculated, cleared outturns are removed. However, when Day N+1's opening stock is calculated by copying Day N's closing stock, the filter is not reapplied. This happens because:

- The opening stock is set at the START of each day's iteration (before the cleared filter runs)
- The cleared filter only runs during closing stock calculation
- The next day's opening stock uses the unfiltered closing stock from memory

## Components and Interfaces

### Component: Paddy Stock Tab (Records.tsx)

**Location**: `client/src/pages/Records.tsx`, lines ~2814-3500

**Key Data Structures**:

```typescript
// Opening stock structures (need filtering)
openingStockByKey: { [key: string]: { variety, bags, location } }
openingProductionShifting: { [key: string]: { variety, bags, outturn, warehouse } }

// Closing stock structures (already filtered)
closingStockByKey: { [key: string]: { variety, bags, location } }
productionShiftingClosing: { [key: string]: { variety, bags, outturn, warehouse } }

// Rice production data (contains CLEARING entries)
allRiceProductions: Array<{
  outturn: { code: string },
  locationCode: string,
  date: string,
  paddyBagsDeducted: number
}>
```

**Existing Filter Logic** (lines 3137-3154):
```typescript
// Filter out cleared outturns from production shifting stock
Object.keys(productionShiftingClosing).forEach(key => {
  const item = productionShiftingClosing[key];
  // Find CLEARING entry in rice productions for this outturn
  const clearingEntry = allRiceProductions.find((rp: any) => 
    rp.outturn?.code === item.outturn && 
    rp.locationCode === 'CLEARING'
  );
  if (clearingEntry) {
    const clearingDate = clearingEntry.date;
    // If outturn was cleared on or before this date, remove it from stock
    if (clearingDate <= date) {
      console.log(`[${date}] Removing cleared outturn ${item.outturn} (cleared on ${clearingDate}) from production shifting stock`);
      delete productionShiftingClosing[key];
    }
  }
});
```

## Data Models

### Input Data

**allRiceProductions** (fetched via `fetchAllRiceProductions()`):
- Array of all rice production records
- Each record contains: `outturn.code`, `locationCode`, `date`, `paddyBagsDeducted`
- CLEARING entries have `locationCode === 'CLEARING'`

**dateRecords** (from `records` state):
- Grouped by date
- Contains arrival/transaction records for each day

### Processing Flow

```
For each date in records:
  1. Calculate opening stock (copy from previous closing)
     → ISSUE: No cleared filter applied here
  
  2. Process day's transactions (purchases, shifting, etc.)
  
  3. Deduct rice production from production shifting
  
  4. Filter cleared outturns from closing stock
     → This works correctly
  
  5. Store closing stock for next iteration
     → Next day's opening uses this, but filter not reapplied
```

## Error Handling

### Potential Issues

1. **Missing CLEARING entries**: If `allRiceProductions` is empty or doesn't load
   - **Mitigation**: Check if `allRiceProductions` exists before filtering
   - **Fallback**: Skip filtering if data is unavailable (safe default)

2. **Date format mismatches**: If dates are in different formats
   - **Mitigation**: Ensure consistent YYYY-MM-DD format for all date comparisons
   - **Current**: Code already uses string comparison which works for ISO dates

3. **Multiple CLEARING entries**: If an outturn has multiple CLEARING entries
   - **Mitigation**: Use the earliest CLEARING date (`.find()` returns first match)
   - **Current behavior**: Already handles this correctly

## Testing Strategy

### Unit Testing Approach

Since this is frontend display logic, testing will be manual verification:

1. **Test Case 1: Cleared outturn on Day 1**
   - Create an outturn with production shifting
   - Add a CLEARING entry on Day 1
   - Verify Day 1 closing stock excludes the outturn
   - Verify Day 2 opening stock excludes the outturn

2. **Test Case 2: Cleared outturn mid-period**
   - View stock for a date range (e.g., Jan 1-10)
   - Clear an outturn on Jan 5
   - Verify Jan 1-4 show the outturn
   - Verify Jan 5 closing excludes the outturn
   - Verify Jan 6-10 opening excludes the outturn

3. **Test Case 3: Multiple outturns, one cleared**
   - Have 3 outturns with production shifting
   - Clear only outturn #2
   - Verify outturns #1 and #3 still appear
   - Verify outturn #2 is excluded after clearing

### Integration Testing

1. **Stock Continuity**: Verify Day N closing = Day N+1 opening
2. **Total Calculations**: Verify opening total + purchases - production = closing total
3. **Console Logs**: Check browser console for filtering messages

## Design Decisions

### Decision 1: Where to Apply the Filter

**Options Considered**:
1. Apply filter when calculating opening stock (at the start of each day)
2. Apply filter when storing closing stock (at the end of each day)
3. Apply filter to both opening and closing

**Chosen**: Option 1 - Apply filter when calculating opening stock

**Rationale**:
- Opening stock is the entry point for each day's calculations
- Ensures consistency from the start of the day
- Matches the existing pattern where closing stock is filtered
- Simpler to maintain - one filter location per stock type

### Decision 2: Reuse Existing Filter Logic

**Options Considered**:
1. Create a separate filter function
2. Duplicate the filter logic for opening stock
3. Extract to a shared helper function

**Chosen**: Option 2 - Duplicate the filter logic

**Rationale**:
- Keeps the logic inline and easy to understand
- Matches the existing code style in this component
- Minimal refactoring required
- Easy to debug with console logs

### Decision 3: Filter Timing

**Options Considered**:
1. Filter immediately after copying previous closing to opening
2. Filter after all opening stock calculations are complete
3. Filter before displaying the opening stock

**Chosen**: Option 1 - Filter immediately after copying

**Rationale**:
- Ensures all subsequent calculations use filtered data
- Prevents cleared outturns from affecting any calculations
- Matches the pattern used for closing stock filtering
- Clear separation of concerns

## Implementation Notes

### Code Location

The fix will be implemented in `client/src/pages/Records.tsx` around line 3100, immediately after the opening stock is calculated from the previous day's closing stock.

### Pseudo-code

```typescript
// After opening stock is set from previous closing (around line 3100)
// Add this filter logic:

// Filter out cleared outturns from opening production shifting stock
Object.keys(openingProductionShifting).forEach(key => {
  const item = openingProductionShifting[key];
  // Find CLEARING entry in rice productions for this outturn
  const clearingEntry = allRiceProductions.find((rp: any) => 
    rp.outturn?.code === item.outturn && 
    rp.locationCode === 'CLEARING'
  );
  if (clearingEntry) {
    const clearingDate = clearingEntry.date;
    // If outturn was cleared on or before this date, remove it from opening stock
    if (clearingDate <= date) {
      console.log(`[${date}] Removing cleared outturn ${item.outturn} (cleared on ${clearingDate}) from opening production shifting stock`);
      delete openingProductionShifting[key];
    }
  }
});
```

### Performance Considerations

- The filter runs once per date in the view (typically 7-30 dates)
- Each filter iteration checks all rice productions (typically 100-500 records)
- Time complexity: O(dates × outturns × productions) = O(30 × 10 × 500) = ~150,000 operations
- This is acceptable for client-side processing
- No optimization needed at this time

### Logging Strategy

Add console logs to track filtering:
- Log when a cleared outturn is found in opening stock
- Log the clearing date and current date
- Log when an outturn is removed from opening stock
- This matches the existing logging pattern for closing stock
