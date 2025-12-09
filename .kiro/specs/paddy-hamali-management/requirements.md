# Requirements Document

## Introduction

This specification defines a comprehensive Paddy Hamali (labor charges) management system that allows administrators to configure hamali rates, staff to add hamali charges to arrivals, and managers to approve and track hamali expenses in the Hamali Book.

## Glossary

- **System**: The mill stock management web application
- **Paddy Hamali**: Labor charges for various paddy-related work activities
- **Hamali Rate**: The cost per bag or fixed cost for a specific type of work
- **Hamali Entry**: A record of hamali charges applied to a specific arrival
- **Hamali Book**: A ledger showing all approved hamali entries with calculations
- **Arrival**: A paddy purchase/delivery record
- **Staff**: User with staff role who can add hamali entries (requires approval)
- **Manager**: User with manager role who can approve hamali and add auto-approved entries
- **Admin**: User with admin role who can approve hamali and add auto-approved entries
- **Work Type**: Category of hamali work (e.g., Paddy Loading, Paddy Unloading, etc.)
- **Work Option**: Specific variation within a work type (e.g., Sada, KN 0-18 height, etc.)

## Requirements

### Requirement 1: Configure Paddy Hamali Rates in Locations Tab

**User Story:** As an administrator, I want to configure paddy hamali rates in the Locations tab so that staff can select from predefined work types when adding hamali charges.

#### Acceptance Criteria

1. WHEN THE System displays the Locations tab, THE System SHALL show a "Paddy Hamali" section
2. WHEN THE System displays paddy hamali configuration, THE System SHALL show a table with columns: Paddy Work, Details/bag, Rate
3. WHEN THE System displays work types, THE System SHALL show fixed work names that cannot be edited
4. WHEN THE System displays work details, THE System SHALL show fixed descriptions that cannot be edited
5. WHEN THE System displays rates, THE System SHALL allow admin to edit only the Rate column
6. WHEN THE System saves hamali rates, THE System SHALL validate that rates are positive numbers
7. WHEN THE System displays work types with multiple options, THE System SHALL group them under the same work type name

### Requirement 2: Define Standard Paddy Hamali Work Types

**User Story:** As a system administrator, I want the system to have predefined paddy hamali work types matching industry standards so that all mills use consistent terminology.

#### Acceptance Criteria

1. WHEN THE System initializes paddy hamali data, THE System SHALL create the following work types: Paddy Loading, Loose Tumbidu, Paddy Unloading, Paddy Cutting, Plotting, Paddy Shifting, Paddy Filling with Stitching, Per Lorry
2. WHEN THE System displays "Paddy Loading", THE System SHALL show detail "Lorry Loading" with default rate 4.63
3. WHEN THE System displays "Loose Tumbidu", THE System SHALL show detail "Per Bag" with default rate 4.94
4. WHEN THE System displays "Paddy Unloading", THE System SHALL show three options: "Sada" (4.11), "KN (0 to 18 height)" (7.71), "KN (above 18 height)" (3.6)
5. WHEN THE System displays "Paddy Cutting", THE System SHALL show detail "Paddy Cutting" with default rate 2.06
6. WHEN THE System displays "Plotting", THE System SHALL show detail "per bag" with default rate 11.88
7. WHEN THE System displays "Paddy Shifting", THE System SHALL show two options: "Sada" (3.52), "KN (0 to 18 height)" (4.31)
8. WHEN THE System displays "Paddy Filling with Stitching", THE System SHALL show detail "From Rashi/ Bunker" with default rate 3.7
9. WHEN THE System displays "Per Lorry", THE System SHALL show two options: "Association Rate" (62), "Lorry Nitt Jama & Rope pulling" (120)

### Requirement 3: Add Hamali to Arrivals

**User Story:** As a staff member, I want to add hamali charges to an arrival so that labor costs are tracked and recorded.

#### Acceptance Criteria

1. WHEN THE System displays an arrival record, THE System SHALL show an "Add Hamali" button
2. WHEN the user clicks "Add Hamali", THE System SHALL open a hamali entry modal
3. WHEN THE System displays the hamali modal, THE System SHALL show all available work types from paddy hamali configuration
4. WHEN THE System displays work types with multiple options, THE System SHALL show radio buttons for option selection
5. WHEN the user selects a work type, THE System SHALL display the associated rate
6. WHEN the user selects a work option, THE System SHALL display the selected option's rate
7. WHEN THE System calculates hamali amount, THE System SHALL multiply selected rate by arrival bags
8. WHEN THE System displays "Loose Tumbidu", THE System SHALL show a separate bags input field
9. WHEN the user enters bags for "Loose Tumbidu", THE System SHALL multiply the entered bags by the rate
10. WHEN THE System displays the calculation, THE System SHALL show: Work Type, Selected Option, Rate, Bags, Total Amount
11. WHEN the user saves hamali entry, THE System SHALL validate that a work type is selected
12. WHEN the user saves hamali entry, THE System SHALL validate that bags are positive numbers for "Loose Tumbidu"

### Requirement 4: Auto-Approve Hamali for Manager and Admin

**User Story:** As a manager or admin, I want my hamali entries to be automatically approved so that I don't need to wait for approval.

#### Acceptance Criteria

1. WHEN a user with Manager role adds hamali, THE System SHALL set status to "approved" automatically
2. WHEN a user with Admin role adds hamali, THE System SHALL set status to "approved" automatically
3. WHEN a user with Staff role adds hamali, THE System SHALL set status to "pending" requiring approval
4. WHEN THE System saves an approved hamali entry, THE System SHALL immediately add it to Hamali Book
5. WHEN THE System saves a pending hamali entry, THE System SHALL not add it to Hamali Book until approved

### Requirement 5: Edit Hamali Entries

**User Story:** As a staff member, I want to edit hamali entries before approval so that I can correct mistakes.

#### Acceptance Criteria

1. WHEN THE System displays an arrival with hamali entries, THE System SHALL show an "Edit Hamali" button for each entry
2. WHEN the user clicks "Edit Hamali", THE System SHALL open the hamali entry modal with existing data
3. WHEN THE System displays the edit modal, THE System SHALL pre-select the previously selected work type and option
4. WHEN the user changes the work type or option, THE System SHALL recalculate the amount
5. WHEN the user saves edited hamali, THE System SHALL update the existing entry
6. WHEN a hamali entry is approved, THE System SHALL not allow editing by staff
7. WHEN a hamali entry is approved, THE System SHALL allow editing by manager or admin

### Requirement 6: Approve Hamali Entries

**User Story:** As a manager, I want to approve pending hamali entries so that they appear in the Hamali Book.

#### Acceptance Criteria

1. WHEN THE System displays pending hamali entries, THE System SHALL show an "Approve" button for manager and admin users
2. WHEN a manager clicks "Approve", THE System SHALL change the status to "approved"
3. WHEN THE System approves a hamali entry, THE System SHALL add it to Hamali Book
4. WHEN THE System approves a hamali entry, THE System SHALL record the approver's name and approval date
5. WHEN a staff user views hamali entries, THE System SHALL not show the "Approve" button

### Requirement 7: Display Hamali Book

**User Story:** As a manager, I want to view all approved hamali entries in the Hamali Book so that I can track labor expenses.

#### Acceptance Criteria

1. WHEN THE System displays the Hamali Book, THE System SHALL show only approved hamali entries
2. WHEN THE System displays hamali entries, THE System SHALL show: Date, Arrival Number, Party Name, Work Type, Selected Option, Bags, Rate, Amount
3. WHEN THE System displays hamali entries, THE System SHALL allow filtering by date range
4. WHEN THE System displays hamali entries, THE System SHALL allow filtering by work type
5. WHEN THE System displays hamali entries, THE System SHALL show total amount for filtered entries
6. WHEN THE System displays hamali entries, THE System SHALL allow sorting by date, amount, or work type
7. WHEN THE System displays hamali entries, THE System SHALL show who added the entry and who approved it

### Requirement 8: Calculate Hamali Amount Correctly

**User Story:** As a system user, I want hamali amounts to be calculated accurately so that labor costs are tracked correctly.

#### Acceptance Criteria

1. WHEN THE System calculates hamali for standard work types, THE System SHALL use formula: Rate × Arrival Bags = Amount
2. WHEN THE System calculates hamali for "Loose Tumbidu", THE System SHALL use formula: Rate × Entered Bags = Amount
3. WHEN THE System calculates hamali for "Per Lorry" work types, THE System SHALL use the rate as a fixed amount (not multiplied by bags)
4. WHEN THE System displays calculated amount, THE System SHALL round to 2 decimal places
5. WHEN THE System saves hamali entry, THE System SHALL store the calculated amount

### Requirement 9: Validate Hamali Data

**User Story:** As a system administrator, I want hamali data to be validated so that incorrect entries are prevented.

#### Acceptance Criteria

1. WHEN the user saves hamali entry, THE System SHALL validate that a work type is selected
2. WHEN the user saves hamali entry with multiple options, THE System SHALL validate that one option is selected
3. WHEN the user saves hamali entry for "Loose Tumbidu", THE System SHALL validate that bags are entered
4. WHEN the user saves hamali entry, THE System SHALL validate that bags are positive numbers
5. WHEN the user saves hamali entry, THE System SHALL validate that the arrival exists
6. WHEN THE System detects validation errors, THE System SHALL display error messages to the user
7. WHEN THE System detects validation errors, THE System SHALL not save the hamali entry

### Requirement 10: Link Hamali to Arrivals

**User Story:** As a staff member, I want hamali entries to be linked to specific arrivals so that I can track which arrivals have hamali charges.

#### Acceptance Criteria

1. WHEN THE System saves a hamali entry, THE System SHALL link it to the arrival record
2. WHEN THE System displays an arrival, THE System SHALL show all associated hamali entries
3. WHEN THE System displays hamali entries for an arrival, THE System SHALL show total hamali amount for that arrival
4. WHEN THE System deletes an arrival, THE System SHALL not delete associated hamali entries
5. WHEN THE System displays hamali entries, THE System SHALL show the arrival number and party name
