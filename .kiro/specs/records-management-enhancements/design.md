# Design Document

## Overview

This design document outlines the technical approach for implementing eight key enhancements to the Records module of the mill stock management system. The changes focus on terminology updates, improved stock visibility through outturn grouping, enhanced rate display capabilities, refined purchase rate calculation logic, and flexible hamali entry with multiple type selection.

The implementation will span frontend (React/TypeScript), backend (Node.js/Express), and database layers, ensuring consistency across the entire stack.

## Architecture

### System Components Affected

1. **Frontend Components**
   - `client/src/pages/Records.tsx` - Main records display component
   - `client/src/pages/AddPurchaseRate.tsx` - Purchase rate entry form

2. **Backend Routes**
   - `server/routes/records.js` - Records retrieval endpoints
   - `server/routes/rice-productions.js` - Rice production and by-product endpoints
   - `server/routes/purchase-rates.js` - Purchase rate CRUD operations

3. **Database Models**
   - `server/models/ByProduct.js` - By-product data model (field names remain unchanged)
   - `server/models/PurchaseRate.js` - Purchase rate model (add sute fields)

4. **Services**
   - `server/services/YieldCalculationService.js` - Yield calculations (terminology updates)

### Data Flow

```
User Interface (Records.tsx)
    ↓
API Routes (records.js, rice-productions.js)
    ↓
Database Models (Arrival, ByProduct, PurchaseRate)
    ↓
PostgreSQL Database
```

## Components and Interfaces

### 1. Terminology Update: "Rejection Rice" → "Sizer Broken"

#### Frontend Changes

**Display Labels**
- Update all UI labels from "Rejection Rice" to "Sizer Broken"
- Update all UI labels from "Rejection Broken" to "Rejection Broken" (no change, but verify consistency)
- Maintain database field names (`rejectionRice`, `rejectionBroken`) for backward compatibility

**Affected UI Locations**
- Outturn Report by-products table headers
- By-product entry form labels
- By-product summary calculations
- Export functionality labels

#### Backend Changes

**API Response Mapping**
- No changes to database schema or field names
- Frontend will handle display name mapping
- Maintain existing API contracts

**Files to Update**
- `client/src/pages/Records.tsx` - Update display labels in JSX
- Any export utilities that generate Excel/PDF reports

### 2. Daily Working Status in Paddy Stock

#### Design Approach

**Date Range Generation**
- Generate complete date range between `dateFrom` and `dateTo`
- Include all dates regardless of transaction existence
- Mark dates with no transactions as "No Working" or "Mill Closed"

**Data Structure**
```typescript
interface DailyStockStatus {
  date: string;
  hasTransactions: boolean;
  status: 'working' | 'not-working';
  openingStock: number;
  closingStock: number;
  transactions: Arrival[];
}
```

#### Frontend Implementation

**Date Range Logic**
```typescript
// Generate all dates in range
const generateDateRange = (from: string, to: string): string[] => {
  const dates: string[] = [];
  const current = new Date(from);
  const end = new Date(to);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Merge with actual records
const allDates = generateDateRange(dateFrom, dateTo);
const stockWithStatus = allDates.map(date => ({
  date,
  hasTransactions: !!records[date],
  status: records[date] ? 'working' : 'not-working',
  transactions: records[date] || []
}));
```

**Visual Styling**
- Working days: Normal white/light background
- Non-working days: Light gray background with "Mill Closed" badge
- Maintain opening/closing stock continuity across non-working days

### 3. Group Paddy Stock by Outturn

#### Design Approach

**Grouping Logic**
- Primary grouping: Date
- Secondary grouping: Outturn Code (OUT01, OUT02, etc.)
- Tertiary grouping: Movement Type (Purchase, Shifting, Production-Shifting)

**Data Structure**
```typescript
interface OutturnGroup {
  outturnCode: string;
  outturnId: number;
  records: Arrival[];
  subtotal: {
    bags: number;
    netWeight: number;
  };
}

interface DateStockGroup {
  date: string;
  outturnGroups: OutturnGroup[];
  unassignedRecords: Arrival[];
  totals: {
    bags: number;
    netWeight: number;
  };
}
```

#### Frontend Implementation

**Grouping Function**
```typescript
const groupByOutturn = (records: Arrival[]): OutturnGroup[] => {
  const grouped = records.reduce((acc, record) => {
    const key = record.outturnId 
      ? `${record.outturnId}-${record.outturn?.code}` 
      : 'unassigned';
    
    if (!acc[key]) {
      acc[key] = {
        outturnCode: record.outturn?.code || 'Unassigned',
        outturnId: record.outturnId,
        records: [],
        subtotal: { bags: 0, netWeight: 0 }
      };
    }
    
    acc[key].records.push(record);
    acc[key].subtotal.bags += record.bags;
    acc[key].subtotal.netWeight += record.netWeight;
    
    return acc;
  }, {} as Record<string, OutturnGroup>);
  
  return Object.values(grouped);
};
```

**Display Structure**
```
Date: 2024-01-15
  ├─ OUT01 (P.SONA) - 500 bags
  │   ├─ Purchase: 300 bags
  │   └─ Production Shifting: 200 bags
  ├─ OUT02 (RNR) - 300 bags
  │   └─ Purchase: 300 bags
  └─ Unassigned - 100 bags
      └─ Shifting: 100 bags
```

**Visual Design**
- Outturn code displayed as clickable badge/chip
- Hyperlink to rice production details
- Color-coded by outturn status (active/cleared)
- Indented records under each outturn group
- Subtotals shown for each outturn

### 4. Display Rate and Total Amount in Outturn Report

#### Design Approach

**Data Fetching**
- Fetch purchase rates for all arrivals in outturn report
- Include rates for purchase, shifting, and production-shifting records
- Use LEFT JOIN to include records without rates

**Backend API Enhancement**
```javascript
// In records.js - Add purchaseRate to includes
{
  model: PurchaseRate,
  as: 'purchaseRate',
  attributes: ['amountFormula', 'totalAmount', 'averageRate'],
  required: false // LEFT JOIN
}
```

#### Frontend Implementation

**Display Columns**
- Add "Rate/Q" column showing average rate per quintal
- Add "Total Amount" column showing total purchase cost
- Format currency values with ₹ symbol and 2 decimal places

**Table Structure**
```typescript
<Th>Rate/Q</Th>
<Th>Total Amount</Th>

// In row rendering
<Td>
  {arrival.purchaseRate 
    ? `₹${parseFloat(arrival.purchaseRate.averageRate).toFixed(2)}`
    : '-'
  }
</Td>
<Td>
  {arrival.purchaseRate 
    ? `₹${parseFloat(arrival.purchaseRate.totalAmount).toFixed(2)}`
    : '-'
  }
</Td>
```

**Summary Calculations**
- Calculate total amount for entire outturn
- Display grand total at bottom of report
- Show average rate across all records

### 5. Hamali Calculation Logic Change

#### Current Logic
```
MDL/MDWB: baseRate - hamali
CDL/CDWB: baseRate + hamali
```

#### New Logic
```
All rate types: baseRate + hamali (where hamali can be positive or negative)
```

#### Database Schema

**No changes required** - `h` field already stores DECIMAL(10, 2) which supports negative values

#### Backend Calculation

**Update in `server/routes/purchase-rates.js`**
```javascript
// OLD LOGIC (Remove)
const isHamaliSubtracted = rateType === 'MDL' || rateType === 'MDWB';
const hamaliAdjustment = isHamaliSubtracted ? -hamali : hamali;

// NEW LOGIC (Implement)
const hamaliAdjustment = hamali; // Simply use the value as-is (can be negative)
```

**Formula Generation**
```javascript
// If hamali is negative, show with minus sign
const hamaliPart = hamali !== 0 
  ? `${hamali > 0 ? '+' : ''}${hamali}h` 
  : '';
```

#### Frontend Changes

**Update `client/src/pages/AddPurchaseRate.tsx`**
```typescript
// Remove rate-type-based hamali logic
const totalAmount = 
  parseFloat(formData.baseRate || '0') +
  parseFloat(formData.h || '0') + // Always add (can be negative)
  parseFloat(formData.b || '0') +
  parseFloat(formData.lf || '0') +
  (showEGB ? parseFloat(formData.egb || '0') : 0);
```

**User Input Handling**
- Allow negative values in hamali input field
- Show tooltip: "Enter negative value (e.g., -100) to subtract"
- Validate that value is a valid number (positive or negative)

### 6. Add Per Bag and Per Quintal Options for Sute

#### Database Schema Changes

**Add to `purchase_rates` table**
```sql
ALTER TABLE purchase_rates 
ADD COLUMN sute DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN sute_calculation_method VARCHAR(20) DEFAULT 'per_bag' 
  CHECK (sute_calculation_method IN ('per_bag', 'per_quintal'));
```

#### Model Updates

**Update `server/models/PurchaseRate.js`**
```javascript
sute: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,
  defaultValue: 0
},
suteCalculationMethod: {
  type: DataTypes.ENUM('per_bag', 'per_quintal'),
  allowNull: false,
  defaultValue: 'per_bag',
  field: 'sute_calculation_method'
}
```

#### Backend Calculation Logic

**Update calculation in `server/routes/purchase-rates.js`**
```javascript
// Calculate sute based on method
let suteAmount = 0;
if (sute && sute !== 0) {
  if (suteCalculationMethod === 'per_bag') {
    suteAmount = sute * bags;
  } else if (suteCalculationMethod === 'per_quintal') {
    const quintals = netWeight / 100;
    suteAmount = sute * quintals;
  }
}

// Add to total amount
const totalAmount = 
  baseRate +
  hamali +
  bAmount +
  lfAmount +
  egbAmount +
  suteAmount;
```

**Formula Generation**
```javascript
if (sute !== 0) {
  const suteLabel = suteCalculationMethod === 'per_bag' ? 's/bag' : 's/Q';
  adjustmentParts.push(`+${sute}${suteLabel}`);
}
```

#### Frontend Implementation

**Update `client/src/pages/AddPurchaseRate.tsx`**

**Add State**
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  sute: '0',
  suteCalculationMethod: 'per_bag'
});
```

**Add UI Controls**
```typescript
<FormGroup>
  <Label>Sute</Label>
  <Input
    type="number"
    step="0.01"
    value={formData.sute}
    onChange={(e) => handleInputChange('sute', e.target.value)}
    placeholder="Sute"
  />
  <RadioGroup>
    <RadioLabel>
      <input
        type="radio"
        name="suteCalculationMethod"
        value="per_bag"
        checked={formData.suteCalculationMethod === 'per_bag'}
        onChange={(e) => handleInputChange('suteCalculationMethod', e.target.value)}
      />
      Per Bag
    </RadioLabel>
    <RadioLabel>
      <input
        type="radio"
        name="suteCalculationMethod"
        value="per_quintal"
        checked={formData.suteCalculationMethod === 'per_quintal'}
        onChange={(e) => handleInputChange('suteCalculationMethod', e.target.value)}
      />
      Per Quintal
    </RadioLabel>
  </RadioGroup>
</FormGroup>
```

**Update Calculation**
```typescript
let suteAmount = 0;
if (arrival && formData.sute) {
  const suteValue = parseFloat(formData.sute);
  if (formData.suteCalculationMethod === 'per_bag') {
    suteAmount = suteValue * arrival.bags;
  } else {
    suteAmount = suteValue * weightInQuintals;
  }
}

const totalAmount = 
  parseFloat(formData.baseRate || '0') +
  parseFloat(formData.h || '0') +
  bAmount +
  lfAmount +
  (showEGB ? parseFloat(formData.egb || '0') : 0) +
  suteAmount;
```

### 7. Display Rates for Shifting and Production Shifting

#### Design Approach

**Rate Association**
- Shifting records can have associated purchase rates
- Production-shifting records can have associated purchase rates
- Rate is linked via `arrivalId` in `purchase_rates` table

#### Backend Changes

**Already supported** - The `PurchaseRate` model uses `arrivalId` as foreign key, which works for any arrival record regardless of movement type.

**Ensure includes in records routes**
```javascript
// In shifting records endpoint
{
  model: PurchaseRate,
  as: 'purchaseRate',
  attributes: ['amountFormula', 'totalAmount', 'averageRate'],
  required: false
}
```

#### Frontend Implementation

**Display in Outturn Report**
- Show rate columns for all movement types
- Use same formatting as purchase records
- Include in total calculations

**Conditional Display**
```typescript
// Works for purchase, shifting, and production-shifting
<Td>
  {arrival.purchaseRate 
    ? `₹${parseFloat(arrival.purchaseRate.averageRate).toFixed(2)}`
    : '-'
  }
</Td>
```

## Data Models

### Updated PurchaseRate Model

```javascript
{
  id: INTEGER PRIMARY KEY,
  arrivalId: INTEGER UNIQUE NOT NULL,
  sute: DECIMAL(10, 2) DEFAULT 0,  // NEW
  suteCalculationMethod: ENUM('per_bag', 'per_quintal') DEFAULT 'per_bag',  // NEW
  baseRate: DECIMAL(10, 2) NOT NULL,
  rateType: ENUM('CDL', 'CDWB', 'MDL', 'MDWB') NOT NULL,
  h: DECIMAL(10, 2) DEFAULT 0,  // Can be negative
  b: DECIMAL(10, 2) DEFAULT 0,
  bCalculationMethod: ENUM('per_bag', 'per_quintal') NOT NULL,
  lf: DECIMAL(10, 2) DEFAULT 0,
  lfCalculationMethod: ENUM('per_bag', 'per_quintal') NOT NULL,
  egb: DECIMAL(10, 2) DEFAULT 0,
  amountFormula: STRING(200) NOT NULL,
  totalAmount: DECIMAL(10, 2) NOT NULL,
  averageRate: DECIMAL(10, 2) NOT NULL,
  createdBy: INTEGER NOT NULL,
  updatedBy: INTEGER,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

### ByProduct Model (No Changes)

```javascript
{
  id: INTEGER PRIMARY KEY,
  outturnId: INTEGER NOT NULL,
  date: DATE NOT NULL,
  rice: DECIMAL(10, 2) DEFAULT 0,
  rejectionRice: DECIMAL(10, 2) DEFAULT 0,  // Display as "Sizer Broken"
  rjRice1: DECIMAL(10, 2) DEFAULT 0,
  rjRice2: DECIMAL(10, 2) DEFAULT 0,
  broken: DECIMAL(10, 2) DEFAULT 0,
  rejectionBroken: DECIMAL(10, 2) DEFAULT 0,  // Keep as "Rejection Broken"
  zeroBroken: DECIMAL(10, 2) DEFAULT 0,
  faram: DECIMAL(10, 2) DEFAULT 0,
  bran: DECIMAL(10, 2) DEFAULT 0,
  unpolished: DECIMAL(10, 2) DEFAULT 0,
  createdBy: INTEGER NOT NULL,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## Error Handling

### Frontend Validation

1. **Hamali Input**
   - Validate numeric input (allow negative)
   - Show clear error message for invalid input
   - Preserve negative sign in display

2. **Sute Input**
   - Validate numeric input (positive only)
   - Validate calculation method selection
   - Show calculated amount in real-time

3. **Date Range for Working Status**
   - Validate date range is not too large (max 90 days)
   - Show warning if range exceeds recommended limit
   - Handle empty date ranges gracefully

### Backend Validation

1. **Purchase Rate Creation**
   - Validate all required fields present
   - Validate numeric ranges (hamali can be negative, others positive)
   - Validate enum values for calculation methods
   - Return clear error messages

2. **Database Constraints**
   - Unique constraint on `arrivalId` in `purchase_rates`
   - Check constraints on enum fields
   - Foreign key constraints maintained

### Error Messages

```typescript
const ERROR_MESSAGES = {
  INVALID_HAMALI: 'Hamali must be a valid number (can be negative)',
  INVALID_SUTE: 'Sute must be a positive number',
  INVALID_DATE_RANGE: 'Date range cannot exceed 90 days',
  RATE_EXISTS: 'Rate already exists for this record',
  ARRIVAL_NOT_FOUND: 'Purchase record not found',
  INVALID_MOVEMENT_TYPE: 'Rates can only be added to purchase, shifting, or production-shifting records'
};
```

## Testing Strategy

### Unit Tests

1. **Hamali Calculation**
   - Test positive hamali addition
   - Test negative hamali subtraction
   - Test zero hamali (no change)
   - Test formula generation with negative values

2. **Sute Calculation**
   - Test per bag calculation
   - Test per quintal calculation
   - Test zero sute (no change)
   - Test formula generation

3. **Outturn Grouping**
   - Test grouping by outturn code
   - Test handling of unassigned records
   - Test subtotal calculations
   - Test empty groups

4. **Date Range Generation**
   - Test continuous date range
   - Test with gaps in data
   - Test boundary dates
   - Test non-working days

### Integration Tests

1. **Purchase Rate CRUD**
   - Create rate with new sute fields
   - Update existing rate
   - Retrieve rate with all fields
   - Delete rate

2. **Records API**
   - Fetch records with purchase rates
   - Fetch shifting records with rates
   - Fetch outturn report with rates
   - Fetch paddy stock grouped by outturn

3. **By-Product Display**
   - Verify "Sizer Broken" label displayed
   - Verify calculations include renamed field
   - Verify export uses new terminology

### Manual Testing Checklist

- [ ] "Rejection Rice" renamed to "Sizer Broken" in all UI locations
- [ ] Non-working days shown in paddy stock
- [ ] Paddy stock grouped by outturn code
- [ ] Rates displayed in outturn report
- [ ] Positive hamali adds to base rate
- [ ] Negative hamali (e.g., -100) subtracts from base rate
- [ ] Sute per bag calculation works correctly
- [ ] Sute per quintal calculation works correctly
- [ ] Shifting records show rates in outturn report
- [ ] Production-shifting records show rates in outturn report
- [ ] Formula display shows correct signs and units
- [ ] Total amount calculations are accurate

## Migration Strategy

### Database Migration

```sql
-- Migration: Add sute fields to purchase_rates table
-- File: migrations/YYYYMMDDHHMMSS-add-sute-to-purchase-rates.js

ALTER TABLE purchase_rates 
ADD COLUMN IF NOT EXISTS sute DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sute_calculation_method VARCHAR(20) DEFAULT 'per_bag';

-- Add check constraint
ALTER TABLE purchase_rates
ADD CONSTRAINT check_sute_calculation_method 
CHECK (sute_calculation_method IN ('per_bag', 'per_quintal'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_rates_sute 
ON purchase_rates(sute) 
WHERE sute != 0;
```

### Backward Compatibility

1. **Existing Purchase Rates**
   - Default `sute` to 0 for existing records
   - Default `suteCalculationMethod` to 'per_bag'
   - No data migration needed

2. **API Compatibility**
   - New fields optional in API requests
   - Existing clients continue to work
   - New clients can use new fields

3. **Frontend Compatibility**
   - Gracefully handle missing sute fields
   - Show "-" or "0" for records without sute
   - No breaking changes to existing functionality

## Performance Considerations

### Frontend Optimizations

1. **Outturn Grouping**
   - Use memoization for grouping calculations
   - Avoid re-grouping on every render
   - Use React.memo for group components

2. **Date Range Generation**
   - Limit maximum date range to 90 days
   - Show warning for large ranges
   - Use pagination for large datasets

3. **Rate Display**
   - Fetch rates in batch with records
   - Avoid N+1 query problem
   - Cache rate data in component state

### Backend Optimizations

1. **Database Queries**
   - Use LEFT JOIN for optional purchase rates
   - Add indexes on frequently queried fields
   - Limit result sets with pagination

2. **API Response Size**
   - Only include necessary fields in responses
   - Use field selection in Sequelize queries
   - Compress large responses

## Security Considerations

1. **Input Validation**
   - Sanitize all numeric inputs
   - Validate enum values against allowed list
   - Prevent SQL injection with parameterized queries

2. **Authorization**
   - Verify user permissions for rate creation/update
   - Restrict rate deletion to admin users
   - Audit log all rate changes

3. **Data Integrity**
   - Validate foreign key references
   - Ensure transaction atomicity
   - Maintain referential integrity

## Deployment Plan

### Phase 1: Database Migration
1. Run migration script on staging
2. Verify schema changes
3. Test backward compatibility
4. Run migration on production

### Phase 2: Backend Deployment
1. Deploy updated models and routes
2. Verify API endpoints
3. Test with existing data
4. Monitor error logs

### Phase 3: Frontend Deployment
1. Deploy updated React components
2. Verify UI changes
3. Test user workflows
4. Gather user feedback

### Rollback Plan
1. Keep previous version tagged
2. Database migration reversible
3. Frontend can rollback independently
4. Monitor for issues post-deployment

## 8. Multiple Hamali Type Selection with Conditional Bags Input

### Design Approach

**Current Behavior**
- Single hamali type selection per entry
- Bags automatically taken from arrival record
- No support for loose tumbidu manual bag entry

**New Behavior**
- Multiple hamali types can be selected simultaneously
- "Loose Tumbidu" shows manual bags input field
- "Paddy Unloading", "Paddy Shifting", "Per Lorry" are mutually exclusive (only one at a time)
- Total bags calculated based on selection combination

### Component Architecture

**Affected Components**
- `client/src/components/AddPaddyHamaliModal.tsx` - Main hamali entry modal
- `server/routes/paddy-hamali-entries.js` - Backend hamali entry creation
- `server/models/PaddyHamaliEntry.js` - Hamali entry model (no schema changes needed)

### Frontend Implementation

#### UI Control Structure

**Hamali Type Selection**
```typescript
interface HamaliTypeConfig {
  value: string;
  label: string;
  group: 'restricted' | 'unrestricted';
  requiresManualBags: boolean;
}

const HAMALI_TYPES: HamaliTypeConfig[] = [
  { 
    value: 'paddy_unloading', 
    label: 'Paddy Unloading', 
    group: 'restricted',
    requiresManualBags: false
  },
  { 
    value: 'paddy_shifting', 
    label: 'Paddy Shifting', 
    group: 'restricted',
    requiresManualBags: false
  },
  { 
    value: 'per_lorry', 
    label: 'Per Lorry', 
    group: 'restricted',
    requiresManualBags: false
  },
  { 
    value: 'loose_tumbidu', 
    label: 'Loose Tumbidu', 
    group: 'unrestricted',
    requiresManualBags: true
  }
];
```

#### State Management

```typescript
interface HamaliFormState {
  selectedTypes: string[]; // Array of selected hamali type values
  looseTumbiduBags: number; // Manual bags input for loose tumbidu
  arrivalBags: number; // Bags from arrival record (read-only)
}

const [formState, setFormState] = useState<HamaliFormState>({
  selectedTypes: [],
  looseTumbiduBags: 0,
  arrivalBags: arrival?.bags || 0
});
```

#### Selection Logic

**Mutual Exclusion for Restricted Group**
```typescript
const handleTypeSelection = (selectedType: string) => {
  const typeConfig = HAMALI_TYPES.find(t => t.value === selectedType);
  
  if (!typeConfig) return;
  
  let newSelectedTypes = [...formState.selectedTypes];
  
  if (newSelectedTypes.includes(selectedType)) {
    // Deselect
    newSelectedTypes = newSelectedTypes.filter(t => t !== selectedType);
  } else {
    // Select
    if (typeConfig.group === 'restricted') {
      // Remove any other restricted type before adding this one
      const restrictedTypes = HAMALI_TYPES
        .filter(t => t.group === 'restricted')
        .map(t => t.value);
      
      newSelectedTypes = newSelectedTypes.filter(
        t => !restrictedTypes.includes(t)
      );
    }
    
    newSelectedTypes.push(selectedType);
  }
  
  setFormState({
    ...formState,
    selectedTypes: newSelectedTypes
  });
};
```

#### Bags Calculation Logic

```typescript
const calculateTotalBags = (): number => {
  const hasLooseTumbidu = formState.selectedTypes.includes('loose_tumbidu');
  
  if (hasLooseTumbidu) {
    // Add loose tumbidu bags to arrival bags
    return formState.arrivalBags + formState.looseTumbiduBags;
  } else {
    // Use arrival bags only
    return formState.arrivalBags;
  }
};

const getBagsForType = (type: string): number => {
  if (type === 'loose_tumbidu') {
    return formState.looseTumbiduBags;
  } else {
    return formState.arrivalBags;
  }
};
```

#### UI Layout

```typescript
<Modal>
  <ModalHeader>Add Hamali Entry</ModalHeader>
  <ModalBody>
    {/* Arrival Info Display */}
    <InfoSection>
      <Label>Arrival Bags:</Label>
      <Value>{formState.arrivalBags}</Value>
    </InfoSection>
    
    {/* Hamali Type Selection */}
    <FormGroup>
      <Label>Select Hamali Type(s)</Label>
      <HelpText>
        Note: Only one of Paddy Unloading, Paddy Shifting, or Per Lorry can be selected at a time
      </HelpText>
      
      <CheckboxGroup>
        {HAMALI_TYPES.map(type => (
          <CheckboxWrapper key={type.value}>
            <Checkbox
              id={type.value}
              checked={formState.selectedTypes.includes(type.value)}
              onChange={() => handleTypeSelection(type.value)}
            />
            <CheckboxLabel htmlFor={type.value}>
              {type.label}
            </CheckboxLabel>
          </CheckboxWrapper>
        ))}
      </CheckboxGroup>
    </FormGroup>
    
    {/* Conditional Loose Tumbidu Bags Input */}
    {formState.selectedTypes.includes('loose_tumbidu') && (
      <FormGroup>
        <Label>Loose Tumbidu Bags</Label>
        <Input
          type="number"
          min="0"
          value={formState.looseTumbiduBags}
          onChange={(e) => setFormState({
            ...formState,
            looseTumbiduBags: parseInt(e.target.value) || 0
          })}
          placeholder="Enter bags for loose tumbidu"
        />
      </FormGroup>
    )}
    
    {/* Total Bags Display */}
    <InfoSection>
      <Label>Total Bags:</Label>
      <Value>{calculateTotalBags()}</Value>
    </InfoSection>
    
    {/* Selected Types Summary */}
    {formState.selectedTypes.length > 0 && (
      <SummarySection>
        <SummaryTitle>Selected Types:</SummaryTitle>
        <TypesList>
          {formState.selectedTypes.map(typeValue => {
            const type = HAMALI_TYPES.find(t => t.value === typeValue);
            const bags = getBagsForType(typeValue);
            return (
              <TypeItem key={typeValue}>
                {type?.label}: {bags} bags
              </TypeItem>
            );
          })}
        </TypesList>
      </SummarySection>
    )}
  </ModalBody>
  
  <ModalFooter>
    <Button onClick={handleCancel}>Cancel</Button>
    <Button 
      onClick={handleSubmit} 
      disabled={formState.selectedTypes.length === 0}
    >
      Add Hamali
    </Button>
  </ModalFooter>
</Modal>
```

### Backend Implementation

#### API Endpoint Changes

**Endpoint:** `POST /api/paddy-hamali-entries/bulk`

**Request Body**
```typescript
interface BulkHamaliEntryRequest {
  arrivalId: number;
  entries: {
    hamaliType: string;
    bags: number;
    date: string;
  }[];
}
```

**Example Request**
```json
{
  "arrivalId": 123,
  "entries": [
    {
      "hamaliType": "paddy_unloading",
      "bags": 100,
      "date": "2024-01-15"
    },
    {
      "hamaliType": "loose_tumbidu",
      "bags": 50,
      "date": "2024-01-15"
    }
  ]
}
```

#### Route Handler

```javascript
// In server/routes/paddy-hamali-entries.js

router.post('/bulk', authenticateToken, async (req, res) => {
  const { arrivalId, entries } = req.body;
  const userId = req.user.id;
  
  try {
    // Validate arrival exists
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }
    
    // Validate entries
    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: 'At least one hamali type must be selected' });
    }
    
    // Validate mutual exclusion for restricted types
    const restrictedTypes = ['paddy_unloading', 'paddy_shifting', 'per_lorry'];
    const selectedRestrictedTypes = entries
      .map(e => e.hamaliType)
      .filter(type => restrictedTypes.includes(type));
    
    if (selectedRestrictedTypes.length > 1) {
      return res.status(400).json({ 
        error: 'Only one of Paddy Unloading, Paddy Shifting, or Per Lorry can be selected' 
      });
    }
    
    // Create entries in transaction
    const transaction = await sequelize.transaction();
    
    try {
      const createdEntries = [];
      
      for (const entry of entries) {
        // Fetch rate for this hamali type
        const rate = await PaddyHamaliRate.findOne({
          where: { hamaliType: entry.hamaliType },
          order: [['createdAt', 'DESC']]
        });
        
        if (!rate) {
          throw new Error(`No rate found for hamali type: ${entry.hamaliType}`);
        }
        
        // Calculate amount
        const amount = rate.ratePerBag * entry.bags;
        
        // Create entry
        const hamaliEntry = await PaddyHamaliEntry.create({
          arrivalId,
          hamaliType: entry.hamaliType,
          bags: entry.bags,
          ratePerBag: rate.ratePerBag,
          amount,
          date: entry.date,
          createdBy: userId
        }, { transaction });
        
        createdEntries.push(hamaliEntry);
      }
      
      await transaction.commit();
      
      res.status(201).json({
        message: 'Hamali entries created successfully',
        entries: createdEntries
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating bulk hamali entries:', error);
    res.status(500).json({ 
      error: 'Failed to create hamali entries',
      details: error.message 
    });
  }
});
```

#### Frontend API Call

```typescript
const handleSubmit = async () => {
  try {
    const entries = formState.selectedTypes.map(type => ({
      hamaliType: type,
      bags: getBagsForType(type),
      date: arrival.date
    }));
    
    const response = await fetch('/api/paddy-hamali-entries/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        arrivalId: arrival.id,
        entries
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create hamali entries');
    }
    
    const result = await response.json();
    
    // Show success message
    toast.success(`${result.entries.length} hamali entries created successfully`);
    
    // Close modal and refresh data
    onClose();
    onSuccess();
    
  } catch (error) {
    console.error('Error creating hamali entries:', error);
    toast.error(error.message);
  }
};
```

### Data Flow Diagram

```
User Interface (AddPaddyHamaliModal)
    ↓
  Select Multiple Types
    ↓
  [Loose Tumbidu Selected?]
    ↓ Yes
  Show Bags Input Field
    ↓
  Calculate Total Bags
    ↓
  Submit → POST /api/paddy-hamali-entries/bulk
    ↓
  Backend Validation
    ↓
  Create Multiple Entries (Transaction)
    ↓
  Return Success
    ↓
  Refresh Records View
```

### Validation Rules

#### Frontend Validation

1. **At least one type selected**
   - Disable submit button if no types selected
   - Show error message if user tries to submit

2. **Loose Tumbidu bags validation**
   - Must be positive number
   - Cannot be zero if loose tumbidu selected
   - Show error if invalid

3. **Mutual exclusion enforcement**
   - Automatically deselect previous restricted type
   - Show visual feedback (disabled state or tooltip)

#### Backend Validation

1. **Arrival existence**
   - Verify arrival record exists
   - Return 404 if not found

2. **Entries array validation**
   - Must have at least one entry
   - Each entry must have valid hamaliType, bags, date

3. **Mutual exclusion validation**
   - Check only one restricted type selected
   - Return 400 error if violated

4. **Rate availability**
   - Verify rate exists for each hamali type
   - Return error if rate not found

5. **Bags validation**
   - Must be positive number
   - Cannot be zero

### Error Handling

```typescript
const ERROR_MESSAGES = {
  NO_TYPES_SELECTED: 'Please select at least one hamali type',
  INVALID_LOOSE_BAGS: 'Loose tumbidu bags must be a positive number',
  MULTIPLE_RESTRICTED: 'Only one of Paddy Unloading, Paddy Shifting, or Per Lorry can be selected',
  ARRIVAL_NOT_FOUND: 'Arrival record not found',
  RATE_NOT_FOUND: 'Rate not found for selected hamali type',
  CREATE_FAILED: 'Failed to create hamali entries'
};
```

### Visual Design Considerations

1. **Checkbox vs Radio Buttons**
   - Use checkboxes for all types (simpler UX)
   - Implement mutual exclusion logic programmatically
   - Show help text explaining restriction

2. **Visual Feedback**
   - Highlight selected types with accent color
   - Show disabled state for conflicting restricted types
   - Display real-time bags calculation

3. **Responsive Layout**
   - Stack checkboxes vertically on mobile
   - Ensure touch-friendly tap targets
   - Maintain readability on small screens

4. **Accessibility**
   - Proper label associations
   - Keyboard navigation support
   - Screen reader announcements for selection changes

### Testing Scenarios

1. **Single Type Selection**
   - Select only "Paddy Unloading" → Uses arrival bags
   - Select only "Loose Tumbidu" → Shows bags input, uses manual bags

2. **Multiple Type Selection**
   - Select "Paddy Unloading" + "Loose Tumbidu" → Creates 2 entries with respective bags
   - Select "Paddy Shifting" + "Loose Tumbidu" → Creates 2 entries

3. **Mutual Exclusion**
   - Select "Paddy Unloading" then "Paddy Shifting" → Only "Paddy Shifting" remains selected
   - Select "Per Lorry" then "Paddy Unloading" → Only "Paddy Unloading" remains selected

4. **Bags Calculation**
   - Arrival: 100 bags, Loose: 50 bags → Total: 150 bags
   - Arrival: 100 bags, No Loose → Total: 100 bags

5. **Validation**
   - Submit with no types → Error message
   - Submit with loose tumbidu but 0 bags → Error message
   - Submit with valid data → Success

### Migration Considerations

**No database schema changes required** - The existing `paddy_hamali_entries` table already supports multiple entries per arrival with different hamali types.

**Backward Compatibility**
- Existing single-entry hamali records continue to work
- New bulk endpoint doesn't affect existing single-entry endpoint
- Frontend gracefully handles both old and new data

### Performance Considerations

1. **Transaction Usage**
   - Use database transaction for bulk insert
   - Rollback all entries if any fails
   - Ensures data consistency

2. **Rate Lookup Optimization**
   - Cache rates in memory during bulk creation
   - Avoid N+1 query problem
   - Use single query to fetch all needed rates

3. **Frontend Rendering**
   - Use React.memo for checkbox components
   - Debounce bags input changes
   - Optimize re-renders on selection changes
