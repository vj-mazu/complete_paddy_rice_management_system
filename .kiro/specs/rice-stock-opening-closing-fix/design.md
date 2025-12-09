# Design Document

## Overview

This design addresses the rice stock opening/closing stock calculation bug where daily opening stock does not correctly match the previous day's closing stock. The root cause is in the running stock calculation logic in `server/routes/rice-stock.js`. The fix involves ensuring proper chronological processing of transactions and correct carry-forward of stock balances between days.

## Architecture

### Current Implementation Issues

The current implementation in `server/routes/rice-stock.js` has the following problems:

1. **Stock Grouping Inconsistency**: Opening stock is grouped differently than closing stock, causing mismatches
2. **Deep Copy Issues**: The running stock object may not be properly deep-copied when carrying forward to the next day
3. **Transaction Processing Order**: Transactions may not be processed in strict chronological order
4. **Initial Stock Calculation**: The opening stock for the first date in a range may not account for all prior transactions

### Proposed Solution

The solution involves:

1. **Consistent Stock Grouping**: Use the same grouping key for both opening and closing stock
2. **Proper Stock Initialization**: Calculate initial opening stock based on all transactions before the date range
3. **Correct Running Stock Management**: Ensure running stock is properly maintained and carried forward
4. **Transaction Ordering**: Enforce strict chronological ordering of all transactions

## Components and Interfaces

### Modified Component: Rice Stock Route (`server/routes/rice-stock.js`)

#### Current Flow
```
1. Fetch approved rice productions within date range
2. Group productions by date
3. Calculate running stock by iterating through dates
4. For each date:
   - Set opening stock = running stock
   - Process transactions (kunchinittu adds, loading subtracts)
   - Set closing stock = running stock
5. Return formatted response
```

#### Issues in Current Flow
- Opening stock grouping differs from closing stock grouping
- Running stock object reference issues
- No validation of stock continuity

#### Proposed Flow
```
1. Fetch ALL approved rice productions (not just date range)
2. Calculate initial running stock from transactions before date range
3. Group productions by date within the selected range
4. For each date in range:
   - Deep copy running stock as opening stock
   - Process transactions in chronological order
   - Deep copy running stock as closing stock
   - Validate: next day's opening = current day's closing
5. Return formatted response with continuity validation
```

### Key Changes

#### 1. Initial Stock Calculation

**Current Code:**
```javascript
let runningStock = {}; // Empty initialization
```

**Proposed Code:**
```javascript
// Calculate initial stock from all transactions before the date range
let runningStock = {};
const startDate = dates[0];

// Fetch and process all transactions before startDate
const priorProductions = await RiceProduction.findAll({
  where: {
    status: 'approved',
    date: { [Op.lt]: startDate },
    [Op.or]: [
      { locationCode: { [Op.ne]: 'CLEARING' } },
      { locationCode: null }
    ]
  },
  include: [/* same includes */],
  order: [['date', 'ASC'], ['createdAt', 'ASC']]
});

// Process prior transactions to build initial running stock
priorProductions.forEach(prod => {
  // Same logic as current transaction processing
  // This builds the correct opening stock for the first date
});
```

#### 2. Consistent Stock Grouping

**Current Issue:**
- Opening stock is grouped by: `product-packaging-bagSize-location` (excludes outturn)
- Closing stock maintains separate entries per outturn
- This causes mismatch between opening and closing

**Proposed Solution:**
```javascript
// Use consistent grouping for both opening and closing stock
// Group by: product-packaging-bagSize-location-outturn

const createStockKey = (prod) => {
  return `${prod.product}-${prod.packaging}-${prod.bagSizeKg}-${prod.location}-${prod.outturnCode || 'NONE'}`;
};

// Apply this key consistently for all stock operations
```

#### 3. Deep Copy Running Stock

**Current Code:**
```javascript
dayData.openingStock = JSON.parse(JSON.stringify(runningStock));
dayData.closingStock = JSON.parse(JSON.stringify(runningStock));
```

**Issue:** This is correct, but the problem is the grouping inconsistency mentioned above.

**Proposed Code:**
```javascript
// Keep the deep copy approach but ensure consistent grouping
dayData.openingStock = JSON.parse(JSON.stringify(runningStock));

// Process transactions...

dayData.closingStock = JSON.parse(JSON.stringify(runningStock));
```

#### 4. Stock Continuity Validation

**New Addition:**
```javascript
// After calculating all dates, validate continuity
for (let i = 1; i < dates.length; i++) {
  const prevDate = dates[i - 1];
  const currDate = dates[i];
  
  const prevClosing = groupedByDate[prevDate].closingStock;
  const currOpening = groupedByDate[currDate].openingStock;
  
  // Compare stock objects
  const prevKeys = Object.keys(prevClosing).sort();
  const currKeys = Object.keys(currOpening).sort();
  
  if (JSON.stringify(prevKeys) !== JSON.stringify(currKeys)) {
    console.warn(`Stock continuity warning: ${prevDate} -> ${currDate}`);
    console.warn('Previous closing keys:', prevKeys);
    console.warn('Current opening keys:', currKeys);
  }
  
  // Compare quantities
  prevKeys.forEach(key => {
    if (prevClosing[key] && currOpening[key]) {
      if (prevClosing[key].qtls !== currOpening[key].qtls) {
        console.warn(`Quantity mismatch for ${key}: ${prevDate} closing=${prevClosing[key].qtls}, ${currDate} opening=${currOpening[key].qtls}`);
      }
    }
  });
}
```

## Data Models

No changes to database models are required. This is purely a calculation logic fix in the API route.

### Affected Models (Read-Only)
- `RiceProduction`: Source of all rice stock transactions
- `Outturn`: Related data for product variety and type
- `Packaging`: Related data for packaging details

## Error Handling

### Stock Continuity Errors

**Detection:**
```javascript
if (openingStock !== previousClosingStock) {
  console.error('Stock continuity error detected', {
    date: currentDate,
    previousDate: previousDate,
    expected: previousClosingStock,
    actual: openingStock
  });
}
```

**Response:**
- Log detailed error information
- Continue processing (don't break the API)
- Consider adding a `warnings` field to the API response

### Missing Stock for Loading

**Current Handling:**
```javascript
console.warn(`No matching stock found for loading: ${prod.product}`);
```

**Enhanced Handling:**
```javascript
if (!matchingKey) {
  console.error('Loading transaction without matching stock', {
    date: prod.date,
    product: prod.product,
    packaging: prod.packaging,
    outturn: prod.outturnCode,
    quantity: prod.qtls
  });
  
  // Add to warnings array in response
  warnings.push({
    type: 'MISSING_STOCK_FOR_LOADING',
    date: prod.date,
    details: `Cannot load ${prod.qtls}Q of ${prod.product} - no matching stock found`
  });
}
```

## Testing Strategy

### Unit Tests

**Test 1: Opening Stock Equals Previous Closing Stock**
```javascript
describe('Rice Stock Calculation', () => {
  it('should set opening stock equal to previous day closing stock', async () => {
    // Create test data for 3 consecutive days
    // Day 1: Kunchinittu 100Q
    // Day 2: Kunchinittu 50Q
    // Day 3: Loading 30Q
    
    const response = await request(app).get('/api/rice-stock?dateFrom=day1&dateTo=day3');
    
    expect(response.body.riceStock[1].openingStockTotal).toBe(
      response.body.riceStock[0].closingStockTotal
    );
    
    expect(response.body.riceStock[2].openingStockTotal).toBe(
      response.body.riceStock[1].closingStockTotal
    );
  });
});
```

**Test 2: Initial Opening Stock Calculation**
```javascript
it('should calculate correct opening stock for date range start', async () => {
  // Create transactions before date range
  // Jan 1-3: Various transactions totaling 200Q
  // Query for Jan 4-10
  
  const response = await request(app).get('/api/rice-stock?dateFrom=2025-01-04&dateTo=2025-01-10');
  
  expect(response.body.riceStock[0].openingStockTotal).toBe(200);
});
```

**Test 3: Stock Grouping Consistency**
```javascript
it('should maintain consistent stock grouping between opening and closing', async () => {
  // Create kunchinittu with same product but different outturns
  
  const response = await request(app).get('/api/rice-stock');
  const day = response.body.riceStock[0];
  
  // Opening and closing should have same structure
  expect(Object.keys(day.openingStock)).toEqual(Object.keys(day.closingStock));
});
```

### Integration Tests

**Test 1: Multi-Day Stock Flow**
```javascript
it('should maintain accurate stock across multiple days with mixed transactions', async () => {
  // Day 1: Kunchinittu 100Q of Product A
  // Day 2: Kunchinittu 50Q of Product A, 30Q of Product B
  // Day 3: Loading 40Q of Product A
  // Day 4: Loading 20Q of Product B
  
  const response = await request(app).get('/api/rice-stock');
  
  // Verify each day's calculations
  expect(response.body.riceStock[0].closingStockTotal).toBe(100);
  expect(response.body.riceStock[1].openingStockTotal).toBe(100);
  expect(response.body.riceStock[1].closingStockTotal).toBe(180);
  expect(response.body.riceStock[2].openingStockTotal).toBe(180);
  expect(response.body.riceStock[2].closingStockTotal).toBe(140);
  expect(response.body.riceStock[3].openingStockTotal).toBe(140);
  expect(response.body.riceStock[3].closingStockTotal).toBe(120);
});
```

### Manual Testing

1. **Verify Screenshots Scenario**
   - Create the exact scenario from the user's screenshots
   - Jan 4: Verify closing = 215.35Q
   - Jan 5: Verify opening = 215.35Q (not 240Q)
   - Jan 7: Verify opening = Jan 5 closing

2. **Test Date Range Filtering**
   - Query different date ranges
   - Verify opening stock for first date is correct
   - Verify continuity within range

3. **Test Month Filtering**
   - Query by month
   - Verify opening stock for first day of month
   - Verify continuity throughout month

## Implementation Notes

### Code Location
- File: `server/routes/rice-stock.js`
- Function: `router.get('/', auth, async (req, res) => { ... })`

### Key Variables
- `runningStock`: Object maintaining cumulative stock across dates
- `groupedByDate`: Object grouping transactions by date
- `dates`: Sorted array of dates in the range

### Critical Sections
1. Initial stock calculation (before date range)
2. Stock key generation (for grouping)
3. Transaction processing loop
4. Opening/closing stock assignment

### Performance Considerations
- Fetching all prior transactions may impact performance for large datasets
- Consider caching initial stock calculations
- Add database indexes on `date` and `status` fields if not present

### Backward Compatibility
- No API contract changes
- Response structure remains the same
- Only calculation logic changes
