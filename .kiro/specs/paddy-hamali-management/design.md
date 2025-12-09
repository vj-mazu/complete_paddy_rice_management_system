# Design Document

## Overview

This design implements a comprehensive Paddy Hamali management system with three main components:
1. Hamali rate configuration in Locations tab
2. Hamali entry creation and editing in All Arrivals
3. Hamali Book for tracking approved entries

The system includes role-based approval workflows where Manager/Admin entries are auto-approved, while Staff entries require approval.

## Architecture

### Database Schema

#### New Table: `paddy_hamali_rates`
```sql
CREATE TABLE paddy_hamali_rates (
  id SERIAL PRIMARY KEY,
  work_type VARCHAR(100) NOT NULL,
  work_detail VARCHAR(200) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  is_per_lorry BOOLEAN DEFAULT FALSE,
  has_multiple_options BOOLEAN DEFAULT FALSE,
  parent_work_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### New Table: `hamali_entries`
```sql
CREATE TABLE hamali_entries (
  id SERIAL PRIMARY KEY,
  arrival_id INTEGER REFERENCES arrivals(id),
  work_type VARCHAR(100) NOT NULL,
  work_detail VARCHAR(200) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  bags INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved'
  added_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Paddy Hamali Rates
- `GET /api/paddy-hamali-rates` - Get all hamali rates
- `PUT /api/paddy-hamali-rates/:id` - Update a hamali rate (admin only)
- `POST /api/paddy-hamali-rates/initialize` - Initialize default rates (admin only)

#### Hamali Entries
- `POST /api/hamali-entries` - Create hamali entry
- `GET /api/hamali-entries` - Get all hamali entries (with filters)
- `GET /api/hamali-entries/arrival/:arrivalId` - Get hamali entries for an arrival
- `PUT /api/hamali-entries/:id` - Update hamali entry
- `PUT /api/hamali-entries/:id/approve` - Approve hamali entry (manager/admin only)
- `DELETE /api/hamali-entries/:id` - Delete hamali entry

#### Hamali Book
- `GET /api/hamali-book` - Get approved hamali entries with filters

## Components and Interfaces

### 1. Paddy Hamali Configuration (Locations Tab)

**Location:** `client/src/pages/Locations.tsx`

**UI Components:**
- Table displaying work types, details, and rates
- Editable rate input fields
- Save button for updating rates
- Initialize button for setting default rates

**Data Structure:**
```typescript
interface PaddyHamaliRate {
  id: number;
  workType: string;
  workDetail: string;
  rate: number;
  isPerLorry: boolean;
  hasMultipleOptions: boolean;
  parentWorkType?: string;
}
```

**Default Rates:**
```javascript
const DEFAULT_HAMALI_RATES = [
  { workType: 'Paddy Loading', workDetail: 'Lorry Loading', rate: 4.63 },
  { workType: 'Loose Tumbidu', workDetail: 'Per Bag', rate: 4.94 },
  { workType: 'Paddy Unloading', workDetail: 'Sada', rate: 4.11, hasMultipleOptions: true },
  { workType: 'Paddy Unloading', workDetail: 'KN (0 to 18 height)', rate: 7.71, hasMultipleOptions: true, parentWorkType: 'Paddy Unloading' },
  { workType: 'Paddy Unloading', workDetail: 'KN (above 18 height) (add)', rate: 3.6, hasMultipleOptions: true, parentWorkType: 'Paddy Unloading' },
  { workType: 'Paddy Cutting', workDetail: 'Paddy Cutting', rate: 2.06 },
  { workType: 'Plotting', workDetail: 'per bag', rate: 11.88 },
  { workType: 'Paddy Shifting', workDetail: 'Sada', rate: 3.52, hasMultipleOptions: true },
  { workType: 'Paddy Shifting', workDetail: 'KN (0 to 18 height)', rate: 4.31, hasMultipleOptions: true, parentWorkType: 'Paddy Shifting' },
  { workType: 'Paddy Filling with Stitching', workDetail: 'From Rashi/ Bunker', rate: 3.7 },
  { workType: 'Per Lorry', workDetail: 'Association Rate', rate: 62, isPerLorry: true, hasMultipleOptions: true },
  { workType: 'Per Lorry', workDetail: 'Lorry Nitt Jama & Rope pulling', rate: 120, isPerLorry: true, hasMultipleOptions: true, parentWorkType: 'Per Lorry' }
];
```

### 2. Add/Edit Hamali Modal

**Location:** `client/src/components/AddHamaliModal.tsx` (new component)

**UI Components:**
- Work type selection (grouped by parent work type)
- Radio buttons for work options (when multiple options exist)
- Rate display (read-only)
- Bags input (for Loose Tumbidu)
- Bags display (from arrival, read-only for other work types)
- Amount calculation display
- Save and Cancel buttons

**Props:**
```typescript
interface AddHamaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  arrival: Arrival;
  existingEntry?: HamaliEntry;
  onSave: () => void;
}
```

**Calculation Logic:**
```javascript
const calculateAmount = (workType, rate, bags, isPerLorry) => {
  if (isPerLorry) {
    return rate; // Fixed amount for per lorry work
  }
  return rate * bags;
};
```

### 3. Hamali Entry Display (All Arrivals)

**Location:** `client/src/pages/AllArrivals.tsx`

**UI Components:**
- "Add Hamali" button for each arrival
- List of hamali entries for each arrival
- Edit button for each entry (if editable)
- Approve button for pending entries (manager/admin only)
- Total hamali amount display

**Entry Display:**
```typescript
interface HamaliEntryDisplay {
  id: number;
  workType: string;
  workDetail: string;
  rate: number;
  bags: number;
  amount: number;
  status: 'pending' | 'approved';
  addedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}
```

### 4. Hamali Book

**Location:** `client/src/pages/HamaliBook.tsx` (new page)

**UI Components:**
- Date range filter
- Work type filter
- Table displaying approved hamali entries
- Total amount summary
- Export to Excel button

**Table Columns:**
- Date
- Arrival Number
- Party Name
- Work Type
- Work Detail
- Bags
- Rate
- Amount
- Added By
- Approved By

## Data Flow

### Adding Hamali Entry

```
1. User clicks "Add Hamali" on arrival
2. System fetches paddy hamali rates
3. System displays modal with work types
4. User selects work type and option (if applicable)
5. User enters bags (for Loose Tumbidu)
6. System calculates amount
7. User saves entry
8. System checks user role:
   - If Manager/Admin: Set status = 'approved', add to Hamali Book
   - If Staff: Set status = 'pending', wait for approval
9. System saves hamali entry to database
10. System refreshes arrival display
```

### Approving Hamali Entry

```
1. Manager/Admin views pending hamali entries
2. Manager/Admin clicks "Approve" button
3. System updates entry status to 'approved'
4. System records approver and approval date
5. System adds entry to Hamali Book
6. System refreshes display
```

### Editing Hamali Entry

```
1. User clicks "Edit Hamali" on entry
2. System checks if entry is editable:
   - If pending: Allow edit by creator
   - If approved: Allow edit by Manager/Admin only
3. System displays modal with existing data
4. User modifies selection or bags
5. System recalculates amount
6. User saves changes
7. System updates hamali entry
8. System refreshes display
```

## Error Handling

### Validation Errors

**Client-Side:**
- Work type not selected
- Work option not selected (for multiple options)
- Bags not entered (for Loose Tumbidu)
- Bags not a positive number

**Server-Side:**
- Arrival not found
- Hamali rate not found
- User not authorized
- Invalid data format

**Error Messages:**
```javascript
const ERROR_MESSAGES = {
  WORK_TYPE_REQUIRED: 'Please select a work type',
  WORK_OPTION_REQUIRED: 'Please select a work option',
  BAGS_REQUIRED: 'Please enter number of bags',
  BAGS_INVALID: 'Bags must be a positive number',
  ARRIVAL_NOT_FOUND: 'Arrival not found',
  RATE_NOT_FOUND: 'Hamali rate not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  CANNOT_EDIT_APPROVED: 'Cannot edit approved hamali entry (Manager/Admin only)'
};
```

## Security

### Role-Based Access Control

**Staff:**
- Can add hamali entries (pending approval)
- Can edit own pending hamali entries
- Cannot approve hamali entries
- Cannot view Hamali Book

**Manager:**
- Can add hamali entries (auto-approved)
- Can edit any hamali entry
- Can approve pending hamali entries
- Can view Hamali Book

**Admin:**
- All Manager permissions
- Can configure hamali rates
- Can initialize default rates

### Authorization Middleware

```javascript
const checkHamaliPermission = (req, res, next) => {
  const { role } = req.user;
  const { action } = req.body;
  
  if (action === 'approve' && role === 'staff') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (action === 'edit_approved' && role === 'staff') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  next();
};
```

## Testing Strategy

### Unit Tests

1. **Hamali Amount Calculation**
   - Test standard work types (rate × bags)
   - Test Loose Tumbidu (rate × entered bags)
   - Test Per Lorry (fixed rate)

2. **Role-Based Approval**
   - Test Manager/Admin auto-approval
   - Test Staff pending approval

3. **Validation**
   - Test work type selection validation
   - Test bags validation
   - Test rate validation

### Integration Tests

1. **Add Hamali Flow**
   - Create hamali entry as Staff (pending)
   - Create hamali entry as Manager (approved)
   - Verify Hamali Book entries

2. **Edit Hamali Flow**
   - Edit pending entry as creator
   - Edit approved entry as Manager
   - Attempt edit as unauthorized user

3. **Approval Flow**
   - Approve pending entry as Manager
   - Verify entry appears in Hamali Book
   - Verify approval metadata

### Manual Testing

1. Configure hamali rates in Locations tab
2. Add hamali to arrival as different roles
3. Edit hamali entries
4. Approve pending entries
5. View Hamali Book with filters
6. Verify calculations are correct

## Performance Considerations

- Index `arrival_id` in `hamali_entries` table
- Index `status` in `hamali_entries` table for filtering
- Cache hamali rates in frontend (refresh on update)
- Paginate Hamali Book for large datasets

## Future Enhancements

- Bulk approve hamali entries
- Hamali reports by work type
- Hamali expense analytics
- SMS notifications for approvals
- Mobile app support
