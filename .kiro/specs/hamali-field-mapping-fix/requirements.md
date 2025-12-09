# Requirements Document

## Introduction

This document specifies the requirements for fixing the field mapping issue in the Paddy Hamali management system where arrival records are not properly displaying in the Add Hamali modal due to incorrect field name references.

## Glossary

- **Arrival**: A record representing paddy stock movement (purchase, shifting, or production-shifting)
- **Hamali Entry**: A record of labor charges associated with an arrival
- **SL No**: Serial number assigned to each arrival record (stored as `slNo` in database)
- **Broker**: The party name or broker name for purchase arrivals (stored as `broker` in database)
- **Add Hamali Modal**: The user interface component for adding hamali entries to an arrival record
- **Records Page**: The main page displaying all arrival records where users can add hamali entries

## Requirements

### Requirement 1: Fix Field Mapping in Add Hamali Modal

**User Story:** As a data entry operator, I want the Add Hamali modal to correctly display arrival information so that I can verify I'm adding hamali to the correct record.

#### Acceptance Criteria

1. WHEN THE System passes arrival data to the Add Hamali modal, THE System SHALL map `slNo` field to the display label "Arrival Number"
2. WHEN THE System passes arrival data to the Add Hamali modal, THE System SHALL map `broker` field to the display label "Party Name"
3. WHEN THE System displays the selected record in the Add Hamali modal, THE System SHALL show the correct SL No value from the arrival record
4. WHEN THE System displays the selected record in the Add Hamali modal, THE System SHALL show the correct broker value from the arrival record
5. WHEN THE System displays the selected record in the Add Hamali modal, THE System SHALL show the correct bags value from the arrival record
6. WHEN the user saves hamali entries, THE System SHALL successfully create the entries with the correct arrival ID

### Requirement 2: Ensure Consistent Field Usage Across Components

**User Story:** As a developer, I want all components to use consistent field names when referencing arrival data so that the system works reliably.

#### Acceptance Criteria

1. WHEN THE System references arrival serial number in any component, THE System SHALL use the field name `slNo`
2. WHEN THE System references party/broker name in any component, THE System SHALL use the field name `broker`
3. WHEN THE System passes arrival data between components, THE System SHALL maintain consistent field naming
4. WHEN THE System displays arrival information, THE System SHALL correctly map database field names to user-friendly labels
5. WHEN THE System validates arrival data, THE System SHALL check for the existence of `slNo` and `broker` fields, not `arrivalNumber` and `partyName`
