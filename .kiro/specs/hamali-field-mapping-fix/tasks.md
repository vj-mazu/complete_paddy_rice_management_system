# Implementation Plan

- [x] 1. Fix Field Mapping in Records Page


  - Update the arrival object passed to AddPaddyHamaliModal to map database fields to expected props
  - Map `slNo` to `arrivalNumber`
  - Map `broker` to `partyName`
  - Ensure `bags` field is passed correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_



- [ ] 2. Add Defensive Checks for Missing Fields
  - Add null/undefined checks before opening the modal
  - Display appropriate error message if required fields are missing


  - Prevent modal from opening with incomplete data
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 3. Test the Fix
  - Test opening Add Hamali modal for purchase arrivals
  - Verify SL No displays correctly in modal
  - Verify Party Name displays correctly in modal
  - Verify Bags count displays correctly in modal
  - Test adding hamali entries and verify they save successfully
  - Test with shifting arrivals (which may not have broker)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_
