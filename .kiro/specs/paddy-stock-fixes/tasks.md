# Implementation Plan

- [x] 1. Fix Kunchinittu Hyperlink Navigation


  - Add click handler to kunchinittu code spans in PaddyStock.tsx opening stock section
  - Add cursor pointer and underline styling to indicate clickable elements
  - Implement navigation to open kunchinittu ledger in new tab with code parameter
  - Apply same fix to closing stock section if kunchinittu codes are displayed there
  - _Requirements: 1.1, 1.2, 1.3_




- [ ] 2. Implement Daily Stock Continuity
  - [ ] 2.1 Update backend paddy stock endpoint to generate complete date range
    - Modify `/api/ledger/paddy-stock/:id` route in server/routes/ledger.js
    - Ensure allDates array includes all dates from dateFrom to dateTo
    - For dates with no transactions, create ledger entry with opening stock = closing stock
    - Set empty arrays for inward, outward, productionShifting, and riceProduction

    - Maintain running stock calculation across all dates for continuity
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Test daily stock continuity with various date ranges

    - Test with date range containing gaps (transactions on Day 1, 3, 5 only)


    - Verify opening and closing balances maintain continuity
    - Test edge cases: single day, month boundaries, year boundaries
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Implement Monthly Red Box Calculation Reset
  - [x] 3.1 Update getRemainingInProduction function for month-wise calculation


    - Modify getRemainingInProduction in PaddyStock.tsx
    - Calculate first day of current month from currentDay.date
    - Filter allDays to include only dates within current month
    - Sum production shifting and rice production for current month only

    - Calculate remaining as shifted minus consumed for the month
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Update Working section UI to display month label
    - Extract month and year from latest day date


    - Format as "MMM YYYY" (e.g., "Nov 2025")
    - Update SummaryHeader to show "Working (Month Year)"
    - _Requirements: 3.4_

  - [ ] 3.3 Test monthly reset functionality
    - Create test data spanning multiple months
    - Verify red box resets to 0 on first day of new month


    - Verify calculations are isolated per month
    - Test viewing historical months shows correct month-specific values
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Create Database Migration for Outturn Clearing

  - Create migration file server/migrations/add_outturn_clearing_fields.js


  - Add is_cleared BOOLEAN column with default FALSE
  - Add cleared_at TIMESTAMP column
  - Add cleared_by INTEGER column with foreign key to users table
  - Add remaining_bags INTEGER column

  - Add indexes for performance: idx_outturns_is_cleared, idx_arrivals_movement_type
  - _Requirements: 4.6, 4.7_

- [ ] 5. Update Outturn Model
  - Add isCleared field to server/models/Outturn.js
  - Add clearedAt field
  - Add clearedBy field with user reference
  - Add remainingBags field

  - _Requirements: 4.6_

- [ ] 6. Implement Clear Outturn Backend Endpoint
  - [ ] 6.1 Create POST /api/outturns/:id/clear route
    - Add route in server/routes/outturns.js (or create new file if needed)
    - Implement auth middleware to verify user is logged in
    - Check user role is admin or manager, return 403 if not authorized
    - _Requirements: 4.1, 4.2_

  - [ ] 6.2 Implement outturn clearing business logic
    - Fetch outturn by ID with kunchinittu and variety associations

    - Check if outturn is already cleared, return 400 error if true
    - Calculate total shifted bags from production-shifting and for-production arrivals
    - Calculate total consumed bags from rice production records (paddyBagsDeducted)
    - Calculate remaining bags as shifted minus consumed
    - Return 400 error if remaining bags <= 0
    - _Requirements: 4.3, 4.4, 4.7, 4.8_


  - [x] 6.3 Implement database transaction for outturn clearing


    - Start database transaction
    - Update outturn record: set isCleared=true, clearedAt=now, clearedBy=userId, remainingBags
    - Create new Arrival record with movementType='outturn-completion'
    - Set toKunchinintuId and toWarehouseId from outturn
    - Set bags=remainingBags, variety=outturn.allottedVariety
    - Set status='approved', adminApprovedBy=userId
    - Add remarks referencing outturn code

    - Commit transaction on success, rollback on error
    - Return success response with remainingBags and message
    - _Requirements: 4.5, 4.6, 4.8, 4.10_

  - [ ] 6.4 Test clear outturn endpoint
    - Test with admin user - should succeed
    - Test with manager user - should succeed
    - Test with regular user - should return 403

    - Test clearing already cleared outturn - should return 400
    - Test with no remaining bags - should return 400
    - Test database transaction rollback on error
    - _Requirements: 4.1, 4.2, 4.7_

- [ ] 7. Implement Clear Outturn Frontend UI
  - [x] 7.1 Add clear outturn state and handler to OutturnReport.tsx


    - Add clearingOutturn state variable

    - Implement handleClearOutturn function
    - Show confirmation dialog with remaining bags count
    - Call POST /api/outturns/:id/clear endpoint
    - Handle success: show toast, reset remainingBags, refresh available bags
    - Handle errors: show error toast with message
    - _Requirements: 4.3, 4.9, 4.10_

  - [ ] 7.2 Add Clear Outturn UI component
    - Show only when user role is admin or manager
    - Show only when selectedOutturn exists and remainingBags > 0

    - Display warning box with yellow background
    - Show remaining bags count prominently
    - Show explanation text about bags being added to paddy stock
    - Add "Clear Outturn" button with loading state
    - _Requirements: 4.1, 4.2, 4.9_

  - [ ] 7.3 Test clear outturn UI workflow
    - Login as admin, verify button is visible
    - Login as manager, verify button is visible
    - Login as regular user, verify button is hidden
    - Test confirmation dialog appears on click
    - Test success flow: toast message, bags added to stock
    - Test error handling: already cleared, no remaining bags
    - _Requirements: 4.1, 4.2, 4.9, 4.10_

- [ ] 8. Integration Testing and Verification
  - [ ] 8.1 Test complete outturn clearing workflow end-to-end
    - Create new outturn with production shifting (1000 bags)
    - Add rice production entries consuming 850 bags
    - Verify remaining bags shows 150 in UI
    - Clear outturn as admin
    - Verify success message displays
    - Verify 150 bags added to paddy stock
    - Verify outturn marked as cleared in database
    - Attempt to clear again - verify error message
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.10_

  - [ ] 8.2 Verify all fixes work together
    - Test kunchinittu hyperlink navigation from paddy stock
    - Verify daily stock continuity across date ranges with gaps
    - Verify monthly red box calculation resets correctly
    - Verify cleared outturn bags appear in paddy stock ledger
    - Test across month boundaries with all features
    - _Requirements: 1.1, 2.1, 2.5, 3.1, 4.5_
