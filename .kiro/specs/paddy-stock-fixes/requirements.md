# Requirements Document

## Introduction

This document outlines the requirements for fixing and enhancing the Paddy Stock Management system. The system manages paddy inventory, tracks daily transactions, monitors production outturns, and provides detailed stock reporting. The enhancements focus on improving navigation, ensuring data continuity, implementing proper monthly calculations, and adding production completion workflows.

## Glossary

- **Paddy Stock System**: The inventory management module that tracks paddy (raw rice) quantities
- **Kunchinittu**: A specific variety or category of paddy tracked in the system
- **Outurn Report**: A production report showing the conversion efficiency from paddy to rice
- **Red Box**: A visual indicator displaying cumulative calculations in the paddy stock interface
- **Opening Balance**: The quantity of stock at the beginning of a day
- **Closing Balance**: The quantity of stock at the end of a day
- **Production Completion**: The process when all paddy bags have been processed into rice
- **Waste Percentage**: The portion of paddy that does not convert to rice (typically 15-20%)

## Requirements

### Requirement 1

**User Story:** As a stock manager, I want to click on kunchinittu hyperlinks in the paddy stock view, so that I can navigate to detailed kunchinittu information

#### Acceptance Criteria

1. WHEN a user clicks on a kunchinittu hyperlink in the Paddy Stock System, THE Paddy Stock System SHALL navigate to the kunchinittu detail page
2. THE Paddy Stock System SHALL display all kunchinittu entries as clickable hyperlinks
3. THE Paddy Stock System SHALL maintain the current filter and date context when returning from kunchinittu details

### Requirement 2

**User Story:** As a stock manager, I want to see opening and closing balances for every day in paddy stock, so that I can track inventory continuity even when no transactions occur

#### Acceptance Criteria

1. WHEN a day has no transactions, THE Paddy Stock System SHALL display the opening balance equal to the previous day's closing balance
2. WHEN a day has no transactions, THE Paddy Stock System SHALL display the closing balance equal to the opening balance
3. THE Paddy Stock System SHALL display stock entries for all days within the selected date range
4. WHEN transactions exist for a day, THE Paddy Stock System SHALL calculate closing balance as opening balance plus or minus transaction quantities
5. THE Paddy Stock System SHALL maintain chronological continuity of balances across all displayed dates

### Requirement 3

**User Story:** As a stock manager, I want the red box cumulative calculation to reset at the start of each month, so that I can track monthly stock metrics accurately

#### Acceptance Criteria

1. WHEN a new calendar month begins, THE Paddy Stock System SHALL reset the Red Box calculation to zero
2. THE Paddy Stock System SHALL accumulate values in the Red Box throughout the current month only
3. WHEN viewing historical data from previous months, THE Paddy Stock System SHALL display the Red Box calculation for that specific month period
4. THE Paddy Stock System SHALL clearly indicate the month period for the displayed Red Box calculation

### Requirement 4

**User Story:** As an admin or manager, I want to mark production outturns as complete and automatically add remaining paddy bags to stock, so that I can account for waste and maintain accurate inventory

#### Acceptance Criteria

1. WHERE the user role is Admin or Manager, THE Paddy Stock System SHALL display a "Clear Outurn" button in the Outurn Report
2. WHERE the user role is not Admin or Manager, THE Paddy Stock System SHALL hide the "Clear Outurn" functionality
3. WHEN an admin or manager clicks "Clear Outurn", THE Paddy Stock System SHALL calculate the remaining paddy bags based on production completion percentage
4. WHEN calculating remaining bags, THE Paddy Stock System SHALL use the formula: remaining bags equals total input bags minus rice output bags converted to paddy equivalent
5. WHEN the outurn is cleared, THE Paddy Stock System SHALL add the calculated remaining bags to the Paddy Stock System as a new entry
6. WHEN the outurn is cleared, THE Paddy Stock System SHALL mark the outurn record as completed
7. THE Paddy Stock System SHALL prevent clearing an already completed outurn
8. WHEN adding remaining bags to stock, THE Paddy Stock System SHALL record the transaction with a clear reference to the completed outurn
9. THE Paddy Stock System SHALL display a confirmation dialog before clearing an outurn showing the calculated remaining bags
10. WHEN the clear outurn operation completes, THE Paddy Stock System SHALL display a success message with the quantity added to paddy stock
