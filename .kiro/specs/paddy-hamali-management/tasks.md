# Implementation Plan

- [x] 1. Create database schema and models





  - [ ] 1.1 Create `paddy_hamali_rates` table migration
    - Add columns: id, work_type, work_detail, rate, is_per_lorry, has_multiple_options, parent_work_type, timestamps

    - _Requirements: 1.1, 2.1_
  
  - [ ] 1.2 Create `hamali_entries` table migration
    - Add columns: id, arrival_id, work_type, work_detail, rate, bags, amount, status, added_by, approved_by, approved_at, timestamps
    - Add foreign keys to arrivals and users tables

    - Add indexes on arrival_id and status
    - _Requirements: 3.1, 4.1, 6.1, 10.1_
  
  - [x] 1.3 Create PaddyHamaliRate model

    - Define model with all fields
    - Add validation for rate (must be positive)
    - _Requirements: 1.6, 9.4_
  

  - [x] 1.4 Create HamaliEntry model

    - Define model with all fields and associations
    - Add validation for bags (must be positive)
    - Add association to Arrival model
    - Add association to User model (addedBy, approvedBy)
    - _Requirements: 3.11, 9.4, 10.1_


- [ ] 2. Implement Paddy Hamali Rates API
  - [ ] 2.1 Create GET /api/paddy-hamali-rates endpoint
    - Fetch all hamali rates from database
    - Group rates by work type
    - Return rates with parent-child relationships

    - _Requirements: 1.1, 1.7_
  
  - [ ] 2.2 Create PUT /api/paddy-hamali-rates/:id endpoint
    - Validate user is admin

    - Validate rate is positive number
    - Update rate in database

    - Return updated rate
    - _Requirements: 1.5, 1.6_
  
  - [ ] 2.3 Create POST /api/paddy-hamali-rates/initialize endpoint
    - Validate user is admin
    - Insert default hamali rates into database
    - Return success message
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_


- [ ] 3. Implement Hamali Entries API
  - [ ] 3.1 Create POST /api/hamali-entries endpoint
    - Validate arrival exists
    - Validate work type and option selected

    - Validate bags for Loose Tumbidu
    - Calculate amount based on work type
    - Check user role for auto-approval (Manager/Admin)
    - Save hamali entry with appropriate status
    - _Requirements: 3.1, 3.11, 4.1, 4.2, 4.3, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5_
  

  - [ ] 3.2 Create GET /api/hamali-entries/arrival/:arrivalId endpoint
    - Fetch all hamali entries for specific arrival
    - Include user details (addedBy, approvedBy)
    - Return entries with calculated totals
    - _Requirements: 10.2, 10.3_
  


  - [ ] 3.3 Create PUT /api/hamali-entries/:id endpoint
    - Validate user can edit entry (creator for pending, manager/admin for approved)
    - Validate updated data
    - Recalculate amount
    - Update hamali entry




    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 3.4 Create PUT /api/hamali-entries/:id/approve endpoint
    - Validate user is manager or admin
    - Update status to 'approved'

    - Record approver and approval date
    - Return updated entry
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 3.5 Create GET /api/hamali-book endpoint
    - Fetch only approved hamali entries

    - Support date range filtering
    - Support work type filtering
    - Include arrival and user details
    - Calculate total amount
    - Support sorting by date, amount, work type
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_


- [ ] 4. Create Paddy Hamali Configuration UI (Locations Tab)
  - [ ] 4.1 Add Paddy Hamali section to Locations page
    - Create section header

    - Add table for displaying rates

    - Add Initialize button for admin
    - _Requirements: 1.1, 1.2_
  
  - [ ] 4.2 Implement hamali rates table
    - Display columns: Paddy Work, Details/bag, Rate
    - Make work names and details read-only
    - Make rate column editable
    - Group work types with multiple options
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7_
  

  - [ ] 4.3 Implement rate editing functionality
    - Add inline editing for rate column
    - Validate rate is positive number
    - Save updated rate to backend
    - Show success/error messages
    - _Requirements: 1.5, 1.6_
  

  - [ ] 4.4 Implement initialize default rates
    - Add button to initialize default rates
    - Show confirmation dialog
    - Call initialize API endpoint
    - Refresh rates table after initialization
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_


- [ ] 5. Create Add/Edit Hamali Modal Component
  - [ ] 5.1 Create AddHamaliModal component
    - Create modal structure with form
    - Add work type selection dropdown
    - Add radio buttons for work options
    - Add rate display (read-only)
    - Add bags input for Loose Tumbidu

    - Add bags display from arrival (read-only)
    - Add amount calculation display
    - Add Save and Cancel buttons
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  
  - [ ] 5.2 Implement work type selection logic
    - Fetch hamali rates on modal open


    - Group rates by work type
    - Display work types in dropdown
    - Show radio buttons for multiple options
    - Update rate when selection changes
    - _Requirements: 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 5.3 Implement amount calculation
    - Calculate amount when rate or bags change
    - Use formula: rate × bags for standard work
    - Use formula: rate × entered bags for Loose Tumbidu
    - Use fixed rate for Per Lorry work
    - Display calculated amount
    - _Requirements: 3.7, 3.8, 3.9, 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 5.4 Implement form validation
    - Validate work type selected
    - Validate work option selected (if multiple options)
    - Validate bags entered for Loose Tumbidu
    - Validate bags are positive numbers
    - Show validation error messages
    - _Requirements: 3.11, 3.12, 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_
  
  - [ ] 5.5 Implement save functionality
    - Collect form data
    - Call create/update API endpoint
    - Handle success/error responses
    - Close modal on success
    - Refresh parent component
    - _Requirements: 3.11, 5.5_

- [ ] 6. Integrate Hamali into All Arrivals Page
  - [ ] 6.1 Add "Add Hamali" button to arrival records
    - Add button to each arrival row
    - Show button for all users
    - Open AddHamaliModal on click
    - _Requirements: 3.1, 3.2_
  
  - [ ] 6.2 Display hamali entries for each arrival
    - Fetch hamali entries for arrival
    - Display list of entries below arrival
    - Show work type, detail, bags, rate, amount, status
    - Show total hamali amount for arrival
    - _Requirements: 10.2, 10.3_
  
  - [ ] 6.3 Add "Edit Hamali" button to entries
    - Show edit button for each entry
    - Check if user can edit (creator for pending, manager/admin for approved)
    - Open AddHamaliModal with existing data
    - _Requirements: 5.1, 5.2, 5.6, 5.7_
  
  - [ ] 6.4 Add "Approve" button for pending entries
    - Show approve button only for manager/admin
    - Show only for pending entries
    - Call approve API endpoint on click
    - Refresh entries after approval
    - _Requirements: 6.1, 6.2, 6.5_

- [ ] 7. Create Hamali Book Page
  - [ ] 7.1 Create HamaliBook page component
    - Create page structure
    - Add page title and description
    - Add filters section
    - Add table for displaying entries
    - Add total amount summary
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [ ] 7.2 Implement date range filter
    - Add date from and date to inputs
    - Fetch entries when dates change
    - Show all entries if no dates selected
    - _Requirements: 7.3_
  
  - [ ] 7.3 Implement work type filter
    - Add work type dropdown
    - Fetch unique work types
    - Filter entries by selected work type
    - _Requirements: 7.4_
  
  - [ ] 7.4 Implement hamali entries table
    - Display columns: Date, Arrival Number, Party Name, Work Type, Work Detail, Bags, Rate, Amount, Added By, Approved By
    - Fetch approved entries from API
    - Apply filters
    - Support sorting by date, amount, work type
    - _Requirements: 7.2, 7.6, 7.7_
  
  - [ ] 7.5 Implement total amount calculation
    - Calculate sum of filtered entries
    - Display total at bottom of table
    - Update total when filters change
    - _Requirements: 7.5_

- [ ] 8. Add navigation and routing
  - Add Hamali Book link to navigation menu
  - Add route for Hamali Book page
  - Restrict access based on user role (manager/admin only)
  - _Requirements: 7.1_

- [ ] 9. Testing and validation
  - [ ] 9.1 Test hamali rate configuration
    - Test editing rates
    - Test initializing default rates
    - Test validation
  
  - [ ] 9.2 Test adding hamali entries
    - Test as staff (pending approval)
    - Test as manager (auto-approved)
    - Test as admin (auto-approved)
    - Test amount calculations
    - Test validation
  
  - [ ] 9.3 Test editing hamali entries
    - Test editing pending entry as creator
    - Test editing approved entry as manager
    - Test unauthorized edit attempts
  
  - [ ] 9.4 Test approval workflow
    - Test approving pending entries
    - Test approval by manager
    - Test approval by admin
    - Test staff cannot approve
  
  - [ ] 9.5 Test Hamali Book
    - Test filtering by date range
    - Test filtering by work type
    - Test sorting
    - Test total calculation
    - Test access control

- [ ] 10. Documentation and deployment
  - Update user documentation
  - Add API documentation
  - Test in staging environment
  - Deploy to production
