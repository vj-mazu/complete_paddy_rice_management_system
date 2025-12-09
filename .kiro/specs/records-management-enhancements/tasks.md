# Implementation Plan

- [x] 1. Database Migration: Add Sute Fields to Purchase Rates


  - Create migration file to add `sute` and `sute_calculation_method` columns to `purchase_rates` table
  - Add check constraint for `sute_calculation_method` enum values ('per_bag', 'per_quintal')
  - Create index on `sute` column for performance
  - Test migration on development database
  - _Requirements: 6.1, 6.6_



- [ ] 2. Update PurchaseRate Model with Sute Fields
  - Add `sute` field as DECIMAL(10, 2) with default 0
  - Add `suteCalculationMethod` field as ENUM with default 'per_bag'
  - Update model associations and indexes


  - _Requirements: 6.1, 6.6_

- [ ] 3. Update Purchase Rate Calculation Logic
- [x] 3.1 Remove Rate-Type-Based Hamali Logic


  - Remove conditional logic that subtracts hamali for MDL/MDWB rate types
  - Change hamali calculation to always add the value (supporting negative values)
  - Update formula generation to show correct sign for negative hamali
  - _Requirements: 5.1, 5.2, 5.4, 5.5_


- [ ] 3.2 Implement Sute Calculation Logic
  - Add sute calculation based on selected method (per_bag or per_quintal)
  - Calculate sute amount: per_bag = sute × bags, per_quintal = sute × quintals
  - Add sute amount to total amount calculation
  - Update formula generation to include sute with appropriate label (s/bag or s/Q)
  - _Requirements: 6.2, 6.3, 6.4, 6.5_



- [ ] 3.3 Update Purchase Rate API Endpoints
  - Modify POST /purchase-rates to accept sute and suteCalculationMethod
  - Modify PUT /purchase-rates to update sute fields
  - Update validation to allow negative hamali values
  - Update response to include new sute fields

  - _Requirements: 5.5, 5.6, 6.6_

- [ ] 4. Update Purchase Rate Entry Form (AddPurchaseRate.tsx)
- [ ] 4.1 Add Sute Input Fields
  - Add sute numeric input field to form
  - Add radio buttons for sute calculation method (Per Bag / Per Quintal)

  - Add sute to form state management
  - Style sute section consistently with B and LF sections
  - _Requirements: 6.1, 6.7_

- [ ] 4.2 Update Hamali Input Handling
  - Allow negative values in hamali input field
  - Add tooltip explaining negative value usage
  - Update validation to accept negative numbers


  - Remove rate-type-based hamali logic from frontend calculation
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [ ] 4.3 Update Real-Time Calculation Display
  - Include sute in total amount calculation
  - Calculate sute amount based on selected method


  - Update formula display to show sute with correct label
  - Update formula display to show hamali with correct sign
  - Update average rate calculation
  - _Requirements: 5.4, 6.4, 6.5_



- [ ] 5. Update Records Display: Terminology Changes
- [ ] 5.1 Rename "Rejection Rice" to "Sizer Broken" in Outturn Report
  - Update by-products table header from "Rejection Rice" to "Sizer Broken"
  - Update by-product entry form label

  - Update by-product summary calculations display
  - Update chart/graph labels if present
  - Maintain database field name `rejectionRice` for compatibility
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 5.2 Update By-Product Calculations and Totals

  - Verify "Sizer Broken" included in total by-products calculation
  - Update percentage calculations display
  - Update any export functionality to use new terminology
  - _Requirements: 1.4_

- [ ] 6. Implement Daily Working Status in Paddy Stock
- [x] 6.1 Create Date Range Generation Function


  - Implement function to generate all dates between dateFrom and dateTo
  - Include weekends and holidays in date range
  - Handle edge cases (same day, invalid ranges)
  - _Requirements: 2.1, 2.4_


- [ ] 6.2 Merge Generated Dates with Stock Records
  - Create data structure combining all dates with transaction data
  - Mark dates with transactions as "working"
  - Mark dates without transactions as "not-working"
  - Calculate opening and closing stock for all dates
  - _Requirements: 2.2, 2.3_


- [ ] 6.3 Update Paddy Stock Display UI
  - Display all dates in range (working and non-working)
  - Show "Mill Closed" or "No Working" badge for non-working days
  - Apply distinct visual styling for non-working days (gray background)
  - Maintain stock continuity across non-working days
  - _Requirements: 2.2, 2.5_



- [ ] 7. Implement Outturn Grouping in Paddy Stock
- [ ] 7.1 Create Outturn Grouping Function
  - Implement function to group records by outturn code within each date
  - Handle records with no outturn (group as "Unassigned")


  - Calculate subtotals for each outturn group (bags, net weight)
  - Sort groups by outturn code
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 7.2 Update Paddy Stock Display with Outturn Groups
  - Display outturn code as prominent heading/badge

  - Make outturn code clickable (hyperlink to rice production details)
  - Indent records under each outturn group
  - Show subtotals for each outturn group
  - Apply color coding based on outturn status (active/cleared)
  - _Requirements: 3.1, 3.4, 3.6_


- [ ] 7.3 Update Rice Production Deduction Logic
  - Ensure deductions only affect specific outturn group
  - Update deduction calculations to respect outturn boundaries
  - Verify deduction accuracy with grouped display
  - _Requirements: 3.3_

- [x] 8. Add Rate Display to Outturn Report

- [ ] 8.1 Update Records API to Include Purchase Rates
  - Add PurchaseRate to includes in arrivals endpoint
  - Add PurchaseRate to includes in shifting endpoint
  - Use LEFT JOIN (required: false) to include records without rates
  - Include amountFormula, totalAmount, and averageRate fields
  - _Requirements: 4.1, 4.3, 7.1, 7.2_


- [ ] 8.2 Add Rate Columns to Outturn Report Table
  - Add "Rate/Q" column header
  - Add "Total Amount" column header
  - Display average rate with ₹ symbol and 2 decimal places
  - Display total amount with ₹ symbol and 2 decimal places

  - Show "-" or "Not Set" for records without rates
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 8.3 Add Rate Summary Calculations
  - Calculate total amount for entire outturn
  - Calculate average rate across all records

  - Display grand totals at bottom of report
  - Include rates from all movement types (purchase, shifting, production-shifting)
  - _Requirements: 4.6, 7.4, 7.5_

- [x] 9. Enable Rate Display for Shifting Records

  - Verify shifting records can have associated purchase rates
  - Verify production-shifting records can have associated purchase rates
  - Display rates for shifting records in same format as purchase records
  - Include shifting record rates in outturn cost calculations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [ ] 10. Testing and Validation
- [ ] 10.1 Test Hamali Calculation Changes
  - Test positive hamali addition
  - Test negative hamali subtraction (e.g., -100)
  - Test zero hamali (no change)


  - Test formula display with negative values
  - Verify backward compatibility with existing rates

- [ ] 10.2 Test Sute Calculation
  - Test per bag calculation with various bag counts
  - Test per quintal calculation with various weights
  - Test zero sute (no change)
  - Test formula display with both methods
  - Verify total amount accuracy

- [ ] 10.3 Test Outturn Grouping
  - Test grouping with multiple outturns
  - Test handling of unassigned records
  - Test subtotal calculations
  - Test empty groups
  - Test hyperlinks to rice production details

- [ ] 10.4 Test Daily Working Status
  - Test date range with gaps in data
  - Test non-working days display
  - Test stock continuity across non-working days
  - Test visual styling differences

- [ ] 10.5 Test Rate Display in Outturn Report
  - Test rate display for purchase records
  - Test rate display for shifting records
  - Test rate display for production-shifting records
  - Test records without rates
  - Test summary calculations

- [ ] 10.6 Test Terminology Changes
  - Verify "Sizer Broken" displayed in all UI locations
  - Verify database field names unchanged
  - Verify export functionality uses new terminology
  - Verify calculations include renamed field

- [x] 11. Implement Multiple Hamali Type Selection


- [x] 11.1 Create Hamali Type Configuration


  - Define hamali type configuration array with group and requiresManualBags properties
  - Implement restricted group types (paddy_unloading, paddy_shifting, per_lorry)
  - Implement unrestricted types (loose_tumbidu)
  - _Requirements: 8.1, 8.4, 8.5, 8.10_

- [x] 11.2 Update AddPaddyHamaliModal State Management


  - Add selectedTypes array to form state
  - Add looseTumbiduBags field to form state
  - Add arrivalBags field (read-only from arrival record)
  - Implement handleTypeSelection function with mutual exclusion logic
  - _Requirements: 8.1, 8.4, 8.5_

- [x] 11.3 Implement Bags Calculation Logic


  - Create calculateTotalBags function (arrival bags + loose tumbidu bags when applicable)
  - Create getBagsForType function (returns appropriate bags for each type)
  - Update bags display to show total when multiple types selected
  - _Requirements: 8.2, 8.3, 8.6, 8.7_

- [x] 11.4 Update Hamali Modal UI


  - Replace single select dropdown with checkbox group for hamali types
  - Add conditional loose tumbidu bags input field (shown only when loose tumbidu selected)
  - Add help text explaining mutual exclusion for restricted types
  - Add selected types summary section showing bags for each type
  - Update total bags display
  - _Requirements: 8.1, 8.2, 8.9, 8.10_

- [x] 11.5 Implement Frontend Validation

  - Validate at least one type selected before submit
  - Validate loose tumbidu bags is positive number when loose tumbidu selected
  - Disable submit button when no types selected
  - Show error messages for invalid inputs
  - _Requirements: 8.1, 8.2_

- [x] 11.6 Create Bulk Hamali Entry API Endpoint


  - Create POST /api/paddy-hamali-entries/bulk endpoint
  - Accept arrivalId and entries array in request body
  - Validate arrival exists
  - Validate mutual exclusion for restricted types
  - Implement transaction-based bulk insert
  - Fetch rates for each hamali type
  - Calculate amount for each entry
  - Create multiple hamali entries in single transaction
  - Return created entries array
  - _Requirements: 8.8_

- [x] 11.7 Implement Backend Validation

  - Validate entries array has at least one entry
  - Validate only one restricted type selected
  - Validate bags is positive number for each entry
  - Validate rate exists for each hamali type
  - Return appropriate error messages
  - _Requirements: 8.4, 8.5_

- [x] 11.8 Update Frontend API Integration

  - Implement handleSubmit to call bulk endpoint
  - Map selected types to entries array with appropriate bags
  - Handle success response and show success message
  - Handle error response and show error message
  - Refresh records view after successful creation
  - _Requirements: 8.8_

- [x] 11.9 Add Visual Feedback and Accessibility

  - Add highlight for selected types
  - Implement keyboard navigation support
  - Add proper ARIA labels for screen readers
  - Ensure touch-friendly tap targets for mobile
  - Add loading state during submission
  - _Requirements: 8.9_

- [x] 11.10 Test Multiple Hamali Selection


  - Test single type selection (paddy unloading only)
  - Test single type selection (loose tumbidu only with manual bags)
  - Test multiple type selection (paddy unloading + loose tumbidu)
  - Test mutual exclusion (selecting paddy shifting deselects paddy unloading)
  - Test bags calculation with multiple types
  - Test validation errors (no types selected, invalid loose bags)
  - Test backend validation (multiple restricted types)
  - Test transaction rollback on error
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ] 12. Documentation and Deployment
  - Update user documentation with new terminology
  - Document new sute calculation feature
  - Document hamali calculation changes
  - Document multiple hamali type selection feature
  - Create deployment checklist
  - Prepare rollback plan
  - _Requirements: All_
