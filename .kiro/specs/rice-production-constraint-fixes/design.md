# Design Document

## Overview

This design addresses two critical database constraint issues preventing the rice production system from functioning correctly:
1. Missing product types ('RJ Rice 1', 'RJ Rice 2', 'Bran') in the rice_productions table constraint
2. Numeric overflow in the outturns yield_percentage field due to insufficient precision

The solution involves updating the Sequelize model definitions and creating database migrations to modify the constraints and field precision.

## Architecture

The fix involves three layers:
1. **Model Layer**: Update Sequelize model definitions to include new product types and correct field precision
2. **Migration Layer**: Create/update database migrations to alter constraints and field definitions
3. **Validation Layer**: Ensure the changes are applied during database initialization

## Components and Interfaces

### 1. RiceProduction Model (`server/models/RiceProduction.js`)

**Current State:**
- productType ENUM: `['Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished']`
- Missing: 'RJ Rice 1', 'RJ Rice 2'

**Required Changes:**
- Add 'RJ Rice 1' and 'RJ Rice 2' to the productType ENUM
- Maintain all existing product types for backward compatibility

### 2. Outturn Model (`server/models/Outturn.js`)

**Current State:**
- yieldPercentage: `DECIMAL(5, 2)` - allows max value of 999.99

**Required Changes:**
- Update to `DECIMAL(6, 2)` - allows max value of 9999.99
- This accommodates yield percentages that may exceed 100% in edge cases

### 3. Database Migration for Product Types

**File:** `server/migrations/update_rice_production_product_types.js`

**Current Constraint:**
```sql
CHECK ("productType" IN ('Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished'))
```

**Required Changes:**
- Update constraint to include 'RJ Rice 1' and 'RJ Rice 2'
- New constraint:
```sql
CHECK ("productType" IN ('Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2'))
```

### 4. New Migration for Yield Percentage

**File:** `server/migrations/update_yield_percentage_precision.js`

**Purpose:** Alter the yield_percentage column in outturns table

**SQL Operations:**
```sql
ALTER TABLE outturns 
ALTER COLUMN yield_percentage TYPE DECIMAL(6, 2);
```

## Data Models

### RiceProduction
```javascript
{
  productType: {
    type: DataTypes.ENUM(
      'Rice', 
      'Bran', 
      'Farm Bran', 
      'Rejection Rice', 
      'Rejection Broken', 
      'Broken', 
      'Zero Broken', 
      'Faram', 
      'Unpolished',
      'RJ Rice 1',    // NEW
      'RJ Rice 2'     // NEW
    ),
    allowNull: false
  }
}
```

### Outturn
```javascript
{
  yieldPercentage: {
    type: DataTypes.DECIMAL(6, 2),  // Changed from (5, 2)
    field: 'yield_percentage',
    allowNull: true,
    comment: 'Yield percentage (YY) = (Total By-Products / Total Net Weight) × 100'
  }
}
```

## Error Handling

### Migration Errors
- Both migrations should use try-catch blocks to handle cases where:
  - Table doesn't exist yet (fresh database)
  - Constraint already updated
  - Column already has correct precision

### Model Validation
- Sequelize will automatically validate product types against the ENUM
- Database constraint provides additional validation layer
- Both must be kept in sync

## Testing Strategy

### Manual Testing
1. **Product Type Validation:**
   - Create rice production record with 'RJ Rice 1' - should succeed
   - Create rice production record with 'RJ Rice 2' - should succeed
   - Create rice production record with 'Bran' - should succeed
   - Create rice production record with invalid type - should fail

2. **Yield Percentage:**
   - Update outturn with yield percentage > 100 - should succeed
   - Update outturn with yield percentage up to 9999.99 - should succeed
   - Verify existing yield percentages are preserved

### Database Verification
```sql
-- Verify constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'rice_productions_producttype_check';

-- Verify column precision
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'outturns' AND column_name = 'yield_percentage';
```

## Implementation Notes

1. **Migration Execution Order:**
   - Product type migration should run before any rice production records with new types
   - Yield percentage migration can run independently
   - Both should be added to initialization scripts

2. **Backward Compatibility:**
   - All existing product types remain valid
   - Existing yield percentages will be preserved
   - No data migration required

3. **Deployment:**
   - Migrations should be added to:
     - `server/init_database.js`
     - `server/init_fresh_database.js`
     - `server/reset_database.js`
   - Server restart required after migration
