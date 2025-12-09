# Design Document

## Overview

This design document outlines the technical approach for implementing four critical fixes and enhancements to the Paddy Stock Management system:

1. **Kunchinittu Hyperlink Navigation Fix** - Enable clickable navigation from paddy stock view to kunchinittu ledger
2. **Daily Stock Continuity** - Display opening/closing balances for all days, including days with no transactions
3. **Monthly Red Box Calculation Reset** - Implement month-wise calculation for the "Working" section
4. **Outurn Completion Workflow** - Add "Clear Outurn" feature for Admin/Manager to handle production completion

The system currently tracks paddy inventory across multiple kunchinittus (storage locations), manages production outturns, and generates detailed stock reports. These enhancements will improve usability, data accuracy, and production workflow management.

## Architecture

### System Components

The application follows a client-server architecture:

**Frontend (React + TypeScript)**
- `PaddyStock.tsx` - Main paddy stock ledger view
- `OutturnReport.tsx` - Production outturn management and reporting
- `KunchinintuLedger.tsx` - Detailed kunchinittu transaction history

**Backend (Node.js + Express + Sequelize)**
- `/api/ledger/paddy-stock/:id` - Paddy stock data endpoint
- `/api/outturns/:id/clear` - New endpoint for clearing outturns
- `/api/rice-productions/outturn/:id/available-paddy-bags` - Available bags calculation

**Database (PostgreSQL)**
- `Arrival` - Transaction records (purchases, shifting, production)
- `Outturn` - Production batch tracking
- `RiceProduction` - Rice output records
- `Kunchinittu` - Storage location master data

### Data Flow

```
User Action → Frontend Component → API Request → Backend Route → Database Query → Response → UI Update
```

## Components and Interfaces

### 1. Kunchinittu Hyperlink Navigation

#### Frontend Changes (PaddyStock.tsx)

**Current Implementation:**
- Kunchinittu codes are displayed as plain text in the opening stock bifurcation section
- No click interaction available

**New Implementation:**
```typescript
// Add click handler to kunchinittu code display
<span
  onClick={() => {
    if (kunchinittuInfo?.code) {
      const url = `/kunchinittu-ledger?code=${kunchinittuInfo.code}`;
      window.open(url, '_blank');
    }
  }}
  style={{
    cursor: 'pointer',
    textDecoration: 'underline',
    color: '#2563eb',
    fontWeight: 'bold'
  }}
>
  {kunchinittuInfo?.code}
</span>
```

**Affected Components:**
- Opening stock bifurcation display (green background section)
- Closing stock display section

**Navigation Target:**
- Route: `/kunchinittu-ledger?code={code}`
- Opens in new tab to preserve current paddy stock view

### 2. Daily Stock Continuity

#### Backend Changes (server/routes/ledger.js)

**Current Behavior:**
- Only dates with transactions are included in `dailyLedger` array
- Days without transactions are skipped entirely

**New Behavior:**
- Generate complete date range from `dateFrom` to `dateTo`
- For days without transactions:
  - Opening stock = Previous day's closing stock
  - No inward/outward/production transactions
  - Closing stock = Opening stock (no changes)

**Implementation:**

```javascript
// In /api/ledger/paddy-stock/:id endpoint

// Generate all dates in range (already exists)
const allDates = [];
if (dateFrom && dateTo) {
  let currentDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    allDates.push(dateStr);
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Process each date (modify existing loop)
allDates.forEach(date => {
  const dayTransactions = transactions.filter(t => t.date === date);
  
  // Opening stock = previous closing stock (already implemented)
  const openingStock = JSON.parse(JSON.stringify(runningStock));
  
  // If no transactions for this day, skip transaction processing
  // but still create ledger entry with opening = closing
  
  if (dayTransactions.length === 0) {
    // No transactions - stock remains unchanged
    dailyLedger.push({
      date,
      openingStock: Object.values(openingStock),
      inward: [],
      productionShifting: [],
      outward: [],
      riceProduction: [],
      closingStock: Object.values(openingStock), // Same as opening
      openingTotal: calculateTotal(openingStock),
      closingTotal: calculateTotal(openingStock)
    });
    return; // Skip to next date
  }
  
  // Process transactions as normal...
});
```

**Data Structure:**
```typescript
interface DailyLedgerEntry {
  date: string;
  openingStock: StockItem[];
  inward: Transaction[];
  productionShifting: Transaction[];
  outward: Transaction[];
  riceProduction: RiceProductionItem[];
  closingStock: StockItem[];
  openingTotal: number;
  closingTotal: number;
}
```

#### Frontend Changes (PaddyStock.tsx)

**Current Behavior:**
- Renders only days returned from API

**New Behavior:**
- No changes needed - will automatically render all days including those with no transactions
- Empty transaction sections will not display (already handled by conditional rendering)

### 3. Monthly Red Box Calculation Reset

#### Frontend Changes (PaddyStock.tsx)

**Current Implementation:**
```typescript
// getRemainingInProduction calculates cumulative across all dates
const getRemainingInProduction = (
  currentDay: DailyLedgerEntry,
  allDays: DailyLedgerEntry[]
): RemainingInProduction[] => {
  // Currently sums ALL production shifting and rice production
  // across entire date range
}
```

**New Implementation:**
```typescript
const getRemainingInProduction = (
  currentDay: DailyLedgerEntry,
  allDays: DailyLedgerEntry[]
): RemainingInProduction[] => {
  const remaining: RemainingInProduction[] = [];
  
  // Get current date and calculate first day of current month
  const currentDate = new Date(currentDay.date);
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(), 
    currentDate.getMonth(), 
    1
  );
  const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
  
  // Filter days to only include current month
  const currentMonthDays = allDays.filter(day => 
    day.date >= firstDayOfMonthStr && day.date <= currentDay.date
  );
  
  // Calculate month-wise totals: production shifting - rice production
  const monthWiseTotals: { 
    [key: string]: { shifted: number; consumed: number } 
  } = {};
  
  currentMonthDays.forEach(day => {
    // Sum production shifting for this month
    if (day.productionShifting) {
      day.productionShifting.forEach(entry => {
        const key = `${entry.variety}-${entry.outturnCode || '01'}`;
        if (!monthWiseTotals[key]) {
          monthWiseTotals[key] = { shifted: 0, consumed: 0 };
        }
        monthWiseTotals[key].shifted += entry.bags || 0;
      });
    }
    
    // Sum rice production consumption for this month
    if (day.riceProduction) {
      day.riceProduction.forEach(entry => {
        const key = `${entry.variety}-${entry.outturnCode || '01'}`;
        if (!monthWiseTotals[key]) {
          monthWiseTotals[key] = { shifted: 0, consumed: 0 };
        }
        monthWiseTotals[key].consumed += entry.bags || 0;
      });
    }
  });
  
  // Calculate remaining bags (shifted - consumed) for current month
  Object.entries(monthWiseTotals).forEach(([key, totals]) => {
    const [variety, outturnCode] = key.split('-');
    const remainingBags = totals.shifted - totals.consumed;
    
    if (remainingBags > 0) {
      remaining.push({
        variety,
        remaining: remainingBags,
        outturnCode
      });
    }
  });

  return remaining;
};
```

**UI Changes:**
```typescript
// Update Working section header to show month
const currentDate = new Date(latestDay.date);
const monthYear = currentDate.toLocaleDateString('en-GB', { 
  month: 'short', 
  year: 'numeric' 
});

<SummaryHeader style={{ background: '#dc2626' }}>
  Working ({monthYear})
</SummaryHeader>
```

**Behavior:**
- Red box resets to 0 on the 1st of each month
- Accumulates production shifting minus rice production within the current month only
- Historical months show their respective month's calculation when viewing past dates

### 4. Outurn Completion Workflow

#### Backend Changes

**New API Endpoint:**
```javascript
// POST /api/outturns/:id/clear
router.post('/outturns/:id/clear', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    
    // Authorization check
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ 
        error: 'Only Admin and Manager can clear outturns' 
      });
    }
    
    // Get outturn details
    const outturn = await Outturn.findByPk(id, {
      include: [
        { model: Kunchinittu, as: 'kunchinittu' },
        { model: Variety, as: 'variety' }
      ]
    });
    
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }
    
    // Check if already cleared
    if (outturn.isCleared) {
      return res.status(400).json({ 
        error: 'Outturn already cleared' 
      });
    }
    
    // Calculate remaining bags
    const productionShifting = await Arrival.findAll({
      where: {
        outturnId: id,
        movementType: ['production-shifting', 'for-production'],
        status: 'approved'
      }
    });
    
    const totalShifted = productionShifting.reduce(
      (sum, t) => sum + parseInt(t.bags || 0), 
      0
    );
    
    const riceProductions = await RiceProduction.findAll({
      where: {
        outturnId: id,
        status: 'approved'
      }
    });
    
    const totalConsumed = riceProductions.reduce(
      (sum, rp) => sum + parseInt(rp.paddyBagsDeducted || 0), 
      0
    );
    
    const remainingBags = totalShifted - totalConsumed;
    
    if (remainingBags <= 0) {
      return res.status(400).json({ 
        error: 'No remaining bags to clear' 
      });
    }
    
    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Mark outturn as cleared
      await outturn.update(
        { 
          isCleared: true, 
          clearedAt: new Date(),
          clearedBy: user.id,
          remainingBags: remainingBags
        },
        { transaction }
      );
      
      // Add remaining bags back to paddy stock
      // Create a new Arrival record with movement type 'outturn-completion'
      await Arrival.create({
        date: new Date().toISOString().split('T')[0],
        movementType: 'outturn-completion',
        toKunchinintuId: outturn.kunchinintuId,
        toWarehouseId: outturn.warehouseId,
        variety: outturn.allottedVariety,
        bags: remainingBags,
        netWeight: remainingBags * 100, // Estimate: 100kg per bag
        broker: `Outturn Completion - ${outturn.code}`,
        status: 'approved',
        adminApprovedBy: user.id,
        createdBy: user.id,
        outturnId: id,
        remarks: `Remaining bags from completed outturn ${outturn.code}`
      }, { transaction });
      
      await transaction.commit();
      
      res.json({ 
        success: true, 
        remainingBags,
        message: `Outturn cleared. ${remainingBags} bags added to paddy stock.`
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error clearing outturn:', error);
    res.status(500).json({ error: 'Failed to clear outturn' });
  }
});
```

**Database Schema Changes:**
```sql
-- Add new columns to Outturn table
ALTER TABLE outturns ADD COLUMN is_cleared BOOLEAN DEFAULT FALSE;
ALTER TABLE outturns ADD COLUMN cleared_at TIMESTAMP;
ALTER TABLE outturns ADD COLUMN cleared_by INTEGER REFERENCES users(id);
ALTER TABLE outturns ADD COLUMN remaining_bags INTEGER;

-- Add new movement type for outturn completion
-- (No schema change needed - movementType is a string field)
```

#### Frontend Changes (OutturnReport.tsx)

**Current Implementation:**
- Shows available paddy bags
- No clear outturn functionality

**New Implementation:**

```typescript
// Add state for clearing
const [clearingOutturn, setClearingOutturn] = useState(false);

// Add clear outturn handler
const handleClearOutturn = async () => {
  if (!selectedOutturn) {
    toast.error('Please select an outturn number');
    return;
  }

  if (remainingBags <= 0) {
    toast.error('No remaining bags to clear');
    return;
  }

  if (!window.confirm(
    `Clear outturn ${selectedOutturn}? This will add ${remainingBags} remaining bags back to paddy stock.`
  )) {
    return;
  }

  setClearingOutturn(true);
  try {
    const token = localStorage.getItem('token');
    const outturn = outturns.find(o => o.outturnNumber === selectedOutturn);
    
    await axios.post(
      `http://localhost:5000/api/outturns/${outturn.id}/clear`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    toast.success(
      `Outturn cleared! ${remainingBags} bags added back to paddy stock.`
    );
    setRemainingBags(0);
    fetchAvailablePaddyBags();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to clear outturn');
  } finally {
    setClearingOutturn(false);
  }
};

// Add UI component (already exists in current code)
{selectedOutturn && 
 (user?.role === 'admin' || user?.role === 'manager') && 
 remainingBags > 0 && (
  <div style={{ 
    marginTop: '1rem', 
    padding: '1rem', 
    backgroundColor: '#fef3c7', 
    border: '2px solid #f59e0b', 
    borderRadius: '8px'
  }}>
    <div style={{ 
      marginBottom: '0.75rem',
      fontWeight: 'bold',
      color: '#92400e',
      textAlign: 'center'
    }}>
      ⚠️ Outturn Completion
    </div>
    <div style={{ 
      marginBottom: '0.75rem',
      textAlign: 'center',
      color: '#78350f'
    }}>
      Remaining Bags: <strong>{remainingBags} bags</strong>
    </div>
    <div style={{ 
      fontSize: '0.85rem',
      color: '#78350f',
      marginBottom: '0.75rem',
      textAlign: 'center'
    }}>
      These bags will be added back to paddy stock (working) when outturn is cleared.
    </div>
    <Button
      onClick={handleClearOutturn}
      disabled={clearingOutturn}
      style={{
        width: '100%',
        backgroundColor: '#f59e0b',
        color: 'white'
      }}
    >
      {clearingOutturn ? 'Clearing...' : 'Clear Outturn'}
    </Button>
  </div>
)}
```

## Data Models

### Outturn Model Updates

```javascript
// server/models/Outturn.js
module.exports = (sequelize, DataTypes) => {
  const Outturn = sequelize.define('Outturn', {
    // ... existing fields ...
    isCleared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_cleared'
    },
    clearedAt: {
      type: DataTypes.DATE,
      field: 'cleared_at'
    },
    clearedBy: {
      type: DataTypes.INTEGER,
      field: 'cleared_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    remainingBags: {
      type: DataTypes.INTEGER,
      field: 'remaining_bags'
    }
  });
  
  return Outturn;
};
```

### Arrival Model (No changes needed)

The existing `Arrival` model supports the new `outturn-completion` movement type through its flexible `movementType` string field.

## Error Handling

### Kunchinittu Navigation
- **Error:** Kunchinittu code not available
- **Handling:** Disable click, show as plain text
- **User Feedback:** No visual indication if code is missing

### Daily Stock Continuity
- **Error:** Invalid date range
- **Handling:** Return error from API with 400 status
- **User Feedback:** Toast notification "Invalid date range"

### Monthly Red Box Calculation
- **Error:** Invalid date format in ledger data
- **Handling:** Catch exception, log error, return empty array
- **User Feedback:** Red box section not displayed

### Outurn Completion
- **Error:** Unauthorized user (not admin/manager)
- **Handling:** Return 403 Forbidden from API
- **User Feedback:** Toast notification "Only Admin and Manager can clear outturns"

- **Error:** Outturn already cleared
- **Handling:** Return 400 Bad Request from API
- **User Feedback:** Toast notification "Outturn already cleared"

- **Error:** No remaining bags
- **Handling:** Prevent API call, show client-side validation
- **User Feedback:** Toast notification "No remaining bags to clear"

- **Error:** Database transaction failure
- **Handling:** Rollback transaction, return 500 error
- **User Feedback:** Toast notification "Failed to clear outturn"

## Testing Strategy

### Unit Testing

**Frontend Components:**
- Test `getRemainingInProduction` function with various date ranges
- Test month boundary calculations (Dec 31 → Jan 1)
- Test kunchinittu click handler with valid/invalid codes
- Test clear outturn button visibility based on user role

**Backend Routes:**
- Test `/api/ledger/paddy-stock/:id` with date ranges including no-transaction days
- Test `/api/outturns/:id/clear` with different user roles
- Test remaining bags calculation accuracy
- Test transaction rollback on failure

### Integration Testing

**Daily Stock Continuity:**
1. Create transactions on Day 1 and Day 3 only
2. Query paddy stock for Day 1-5
3. Verify Day 2, 4, 5 show opening = closing stock
4. Verify stock continuity across all days

**Monthly Red Box Reset:**
1. Create production shifting on last day of month
2. Create rice production on first day of next month
3. Verify red box shows correct values for each month
4. Verify calculation resets on month boundary

**Outurn Completion:**
1. Create outturn with 1000 bags shifted
2. Create rice production consuming 850 bags
3. Clear outturn as admin
4. Verify 150 bags added to paddy stock
5. Verify outturn marked as cleared
6. Attempt to clear again - should fail

### Manual Testing

**Kunchinittu Navigation:**
- Click kunchinittu code in paddy stock view
- Verify new tab opens with correct kunchinittu ledger
- Verify original paddy stock view remains unchanged

**Daily Stock Continuity:**
- Select date range with gaps in transactions
- Verify all dates display in ledger
- Verify opening/closing balances maintain continuity

**Monthly Red Box:**
- View paddy stock across month boundary
- Verify red box resets on new month
- Verify month label displays correctly

**Outurn Completion:**
- Login as admin/manager
- Select outturn with remaining bags
- Click "Clear Outturn"
- Verify confirmation dialog
- Verify success message
- Verify bags added to paddy stock
- Login as regular user - verify button not visible

## Performance Considerations

### Daily Stock Continuity
- **Impact:** Increased response size for large date ranges
- **Mitigation:** Limit maximum date range to 90 days
- **Optimization:** Consider pagination for very large datasets

### Monthly Red Box Calculation
- **Impact:** Client-side calculation on every render
- **Mitigation:** Memoize calculation result using `useMemo`
- **Optimization:** Calculate only when date changes

### Outurn Completion
- **Impact:** Database transaction with multiple operations
- **Mitigation:** Use database transactions for atomicity
- **Optimization:** Add database indexes on `outturnId` and `movementType`

## Security Considerations

### Authorization
- Clear outturn endpoint restricted to admin and manager roles only
- Role check performed on backend (not just frontend)
- User ID logged for audit trail

### Data Validation
- Validate outturn ID exists before clearing
- Validate remaining bags > 0 before clearing
- Prevent duplicate clearing with `isCleared` flag

### Audit Trail
- Record who cleared the outturn (`clearedBy`)
- Record when outturn was cleared (`clearedAt`)
- Record how many bags were returned (`remainingBags`)
- Create Arrival record with clear reference to outturn

## Deployment Considerations

### Database Migration
```sql
-- Migration file: add_outturn_clearing_fields.sql
ALTER TABLE outturns ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN DEFAULT FALSE;
ALTER TABLE outturns ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP;
ALTER TABLE outturns ADD COLUMN IF NOT EXISTS cleared_by INTEGER REFERENCES users(id);
ALTER TABLE outturns ADD COLUMN IF NOT EXISTS remaining_bags INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_outturns_is_cleared ON outturns(is_cleared);
CREATE INDEX IF NOT EXISTS idx_arrivals_movement_type ON arrivals(movement_type);
```

### Rollback Plan
- Database migration can be rolled back by dropping new columns
- Frontend changes are backward compatible (graceful degradation)
- Backend changes are additive (no breaking changes to existing endpoints)

### Monitoring
- Log all outturn clearing operations
- Monitor API response times for paddy stock endpoint
- Track error rates for new clear outturn endpoint
- Alert on failed database transactions
