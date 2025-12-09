# Implementation Plan

- [x] 1. Update RiceProduction model to include new product types


  - Modify the productType ENUM in `server/models/RiceProduction.js` to add 'RJ Rice 1' and 'RJ Rice 2'
  - Ensure all existing product types remain in the ENUM for backward compatibility
  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [ ] 2. Update Outturn model to fix yield percentage precision
  - Change yieldPercentage field from DECIMAL(5,2) to DECIMAL(6,2) in `server/models/Outturn.js`

  - Preserve the field name, comment, and other properties

  - _Requirements: 2.1, 2.2, 2.3, 2.4_



- [ ] 3. Update product type constraint migration
  - Modify `server/migrations/update_rice_production_product_types.js` to include 'RJ Rice 1' and 'RJ Rice 2' in the CHECK constraint
  - Ensure the migration handles cases where constraint already exists
  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [ ] 4. Create yield percentage precision migration
  - Create new migration file `server/migrations/update_yield_percentage_precision.js`
  - Implement ALTER TABLE statement to change yield_percentage column to DECIMAL(6,2)
  - Add error handling for cases where table doesn't exist or column already updated
  - Export both function and up method for compatibility



  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Integrate migrations into initialization scripts
  - Add yield percentage migration to `server/init_database.js`
  - Add yield percentage migration to `server/init_fresh_database.js`
  - Add yield percentage migration to `server/reset_database.js`
  - Ensure migrations run in correct order
  - _Requirements: 2.4_

- [ ] 6. Verify database changes
  - Run the updated migrations against the database
  - Check that rice_productions constraint includes all product types
  - Check that yield_percentage column has DECIMAL(6,2) precision
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_
