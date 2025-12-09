# Clear Outturn - Complete Flow Explanation

## What Happens When You Click "Clear Outturn"

### Example Scenario:
- **Outturn**: 01
- **Total Paddy Bags Shifted**: 500 bags
- **Used in Rice Production**: 345 bags
- **Remaining Bags**: 155 bags

---

## Step-by-Step Flow

### 1. Calculate Remaining Bags

**Backend Query:**
```javascript
// Get total paddy bags shifted to this outturn
const totalPaddyBags = await Arrival.sum('bags', {
  where: {
    outturnId: id,
    movementType: ['production-shifting', 'purchase']
  }
}); // Result: 500 bags

// Get bags used in rice production
const usedPaddyBags = await RiceProduction.sum('paddyBagsDeducted', {
  where: {
    outturnId: id,
    status: ['pending', 'approved']
  }
}); // Result: 345 bags

// Calculate remaining
const remainingBags = totalPaddyBags - usedPaddyBags;
// Result: 500 - 345 = 155 bags
```

**Where This Data Comes From:**
- `totalPaddyBags`: From `arrivals` table where `outturnId = 01` and `movementType = 'production-shifting'`
- `usedPaddyBags`: From `rice_productions` table where `outturnId = 01`

---

### 2. Create Reverse Entry (Add Bags Back to Stock)

**What Gets Created:**
A new entry in the `arrivals` table:

```javascript
{
  slNo: 'SL123',                    // Auto-generated next SL number
  date: '2024-01-15',               // Today's date
  movementType: 'production-shifting', // Reverse of production shifting
  variety: 'BPT',                   // Same variety as outturn
  bags: 155,                        // The remaining bags
  fromKunchinintuId: 5,             // From outturn back to kunchinittu
  fromWarehouseId: 2,
  toKunchinintuId: 5,               // Back to same kunchinittu
  toWarehouseId: 2,
  outturnId: 1,                     // Link to outturn 01
  wbNo: 'CLEAR-01',                 // Special WB number
  lorryNumber: 'OUTTURN-CLEAR-01',  // Special lorry number
  status: 'approved',               // Auto-approved
  approvedBy: userId,
  adminApprovedBy: userId,
  remarks: 'Outturn 01 cleared - 155 bags returned to stock (working)'
}
```

**Where This Shows Up:**
1. ✅ **Paddy Stock Report** → "Working" section (month-wise)
2. ✅ **Kunchinittu Ledger** → As an inward entry
3. ✅ **Records Tab** → Shifting Records

---

### 3. Mark Outturn as Cleared

**Database Update:**
```javascript
// Update outturns table
{
  isCleared: true,              // Mark as cleared
  clearedAt: '2024-01-15',      // Timestamp
  clearedBy: userId,            // Who cleared it
  remainingBags: 155            // Store the remaining bags count
}
```

**Where This Shows Up:**
- Outturn will no longer show in "Available Outturns" dropdown
- Outturn Report will show "Cleared" status

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  BEFORE CLEAR OUTTURN                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paddy Stock (Kunchinittu 5):                              │
│  ├─ Opening: 1000 bags                                     │
│  ├─ Production Shifting: -500 bags → Outturn 01           │
│  └─ Closing: 500 bags                                      │
│                                                             │
│  Outturn 01 (Working):                                     │
│  ├─ Total Shifted: 500 bags                                │
│  ├─ Used in Production: 345 bags                           │
│  └─ Remaining: 155 bags ⚠️                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                    ⬇️ CLICK "CLEAR OUTTURN" ⬇️

┌─────────────────────────────────────────────────────────────┐
│  AFTER CLEAR OUTTURN                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paddy Stock (Kunchinittu 5):                              │
│  ├─ Opening: 500 bags                                      │
│  ├─ Working (from cleared outturn): +155 bags ✅           │
│  └─ Closing: 655 bags                                      │
│                                                             │
│  Outturn 01:                                               │
│  ├─ Status: CLEARED ✅                                     │
│  ├─ Remaining: 0 bags ✅                                   │
│  └─ Cleared At: 2024-01-15                                 │
│                                                             │
│  New Arrival Entry Created:                                │
│  ├─ SL No: SL123                                           │
│  ├─ Type: production-shifting (reverse)                    │
│  ├─ Bags: 155                                              │
│  ├─ From: Outturn 01 → Kunchinittu 5                      │
│  └─ Status: Approved (auto)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Tables Affected

### 1. `arrivals` Table
**New Row Added:**
```sql
INSERT INTO arrivals (
  slNo, date, movementType, variety, bags,
  fromKunchinintuId, toKunchinintuId,
  outturnId, wbNo, lorryNumber, status,
  approvedBy, adminApprovedBy, createdBy, remarks
) VALUES (
  'SL123', '2024-01-15', 'production-shifting', 'BPT', 155,
  5, 5, 1, 'CLEAR-01', 'OUTTURN-CLEAR-01', 'approved',
  userId, userId, userId, 'Outturn 01 cleared - 155 bags returned to stock'
);
```

### 2. `outturns` Table
**Row Updated:**
```sql
UPDATE outturns 
SET 
  isCleared = true,
  clearedAt = '2024-01-15',
  clearedBy = userId,
  remainingBags = 155
WHERE id = 1;
```

---

## Where to See the Results

### 1. Paddy Stock Report
**Path:** Records → Paddy Stock → Select Kunchinittu 5

**What You'll See:**
```
Date: 15-Jan-2024
├─ Opening Stock: 500 bags
├─ Working (Month-wise):
│  └─ 155 - BPT - 01(Warehouse Name) ✅ NEW!
└─ Closing Stock: 655 bags
```

### 2. Kunchinittu Ledger
**Path:** Kunchinittu Ledger → Select Kunchinittu 5

**What You'll See:**
```
Inward:
+155 | 15-Jan-2024 | BPT | OUTTURN-CLEAR-01 | 01(Warehouse)
```

### 3. Outturn Report
**Path:** Records → Outturn Report → Select Outturn 01

**What You'll See:**
```
Status: CLEARED ✅
Remaining Bags: 0 ✅
Cleared At: 15-Jan-2024
```

### 4. Records Tab - Shifting
**Path:** Records → Shifting Records

**What You'll See:**
```
SL123 | 15-Jan-2024 | BPT | 155 bags | 
From: Kunchinittu 5 → To: Kunchinittu 5 (Outturn 01)
```

---

## Important Notes

### ✅ What This Fix Does:
1. **Adds bags back to paddy stock** (shows in "Working" section)
2. **Creates audit trail** (new arrival entry)
3. **Marks outturn as cleared** (can't be used again)
4. **Auto-approves the entry** (no manual approval needed)

### ⚠️ Previous Behavior (BROKEN):
- Only marked outturn as cleared
- Did NOT add bags back to stock
- Bags were "lost" in the system

### 🔒 Security:
- Only Admin and Manager can clear outturns
- Transaction-based (all or nothing)
- Full audit trail with timestamps and user IDs

---

## Testing Checklist

1. ✅ Go to Outturn Report
2. ✅ Select an outturn with remaining bags (e.g., 155 bags)
3. ✅ Click "Clear Outturn"
4. ✅ Check Paddy Stock → Should show +155 in "Working"
5. ✅ Check Outturn Report → Should show "Cleared" status
6. ✅ Check Kunchinittu Ledger → Should show +155 inward entry
7. ✅ Try to clear same outturn again → Should show "Already cleared" error

---

## Summary

**Before Fix:**
- Clear Outturn → Only marks as cleared
- Remaining bags → Lost/Not tracked
- Paddy Stock → No change

**After Fix:**
- Clear Outturn → Creates reverse entry
- Remaining bags → Added back to stock (Working section)
- Paddy Stock → Shows +155 bags in Working
- Full audit trail maintained
