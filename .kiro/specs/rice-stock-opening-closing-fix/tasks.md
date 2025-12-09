# Implementation Plan

- [x] 1. Add initial stock calculation for date range start


  - Fetch all approved rice productions before the date range start date
  - Process prior transactions to build the initial running stock
  - Ensure the running stock object is properly initialized before processing the date range
  - _Requirements: 1.2, 3.1, 3.2, 4.1_


- [ ] 2. Implement consistent stock grouping key function
  - Create a `createStockKey()` helper function that generates consistent keys
  - Use the key format: `product-packaging-bagSize-location-outturn`
  - Apply this key consistently for kunchinittu transactions
  - Apply this key consistently for loading transaction matching

  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 3. Fix running stock carry-forward logic
  - Ensure deep copy of running stock for opening stock assignment
  - Ensure deep copy of running stock for closing stock assignment

  - Verify that running stock object maintains state correctly between dates
  - _Requirements: 1.1, 1.3, 4.5_

- [ ] 4. Add stock continuity validation
  - Implement validation loop that compares consecutive days
  - Check that opening stock keys match previous closing stock keys

  - Check that opening stock quantities match previous closing stock quantities
  - Log warnings for any continuity issues detected
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 5. Enhance error handling for loading transactions

  - Improve logging when no matching stock is found for loading
  - Add detailed error information (date, product, packaging, outturn, quantity)
  - Consider adding warnings array to API response
  - _Requirements: 2.3, 5.5_


- [ ] 6. Update opening stock grouping in response formatting
  - Remove the separate grouping logic for opening stock display
  - Use the same structure for opening stock as closing stock
  - Ensure opening stock includes all necessary fields (qtls, bags, bagSizeKg, product, packaging, location, outturn)



  - _Requirements: 5.1, 6.1, 6.4_

- [ ] 7. Verify transaction chronological ordering
  - Confirm that transactions are sorted by date ASC and createdAt ASC

  - Ensure this ordering is applied to both prior transactions and date range transactions
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Add unit tests for stock calculation

  - [ ] 8.1 Write test for opening stock equals previous closing stock
    - Create test data for 3 consecutive days with various transactions
    - Assert that each day's opening equals previous day's closing



    - _Requirements: 1.1, 1.4_
  
  - [ ] 8.2 Write test for initial opening stock calculation
    - Create transactions before date range


    - Query for date range and verify first day's opening stock
    - _Requirements: 1.2, 3.1, 3.2_
  
  - [ ] 8.3 Write test for stock grouping consistency
    - Create kunchinittu with same product but different outturns
    - Verify opening and closing stock have consistent structure
    - _Requirements: 5.1, 5.2_

- [ ] 9. Add integration tests for multi-day scenarios
  - [ ] 9.1 Write test for multi-day stock flow
    - Create 4 days of mixed kunchinittu and loading transactions
    - Verify stock calculations for each day
    - Assert continuity across all days
    - _Requirements: 1.4, 2.1, 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Manual testing and verification
  - Test with the exact scenario from user screenshots (Jan 4-7, 2025)
  - Verify Jan 5 opening stock equals Jan 4 closing stock
  - Test various date range filters
  - Test month-based filtering
  - Verify stock continuity across different scenarios
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3_
