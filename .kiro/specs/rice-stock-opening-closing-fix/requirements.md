# Requirements Document

## Introduction

This specification addresses a critical bug in the rice stock calculation where the daily opening stock does not correctly match the previous day's closing stock. This causes stock discrepancies and inaccurate inventory tracking in the Records tab's Rice Stock view.

## Glossary

- **System**: The mill stock management web application
- **Rice Stock**: Inventory view showing rice stock with daily opening and closing balances
- **Opening Stock**: The stock balance at the start of a day, which must equal the previous day's closing stock
- **Closing Stock**: The stock balance at the end of a day after all transactions
- **Running Stock**: The cumulative stock calculation that carries forward from day to day
- **Kunchinittu**: Rice storage movement type (adds to stock)
- **Loading**: Rice dispatch/sale movement type (subtracts from stock)
- **Daily Transactions**: All rice production movements (kunchinittu and loading) for a specific date

## Requirements

### Requirement 1: Fix Opening Stock Calculation

**User Story:** As a mill manager, I want the daily opening stock to exactly match the previous day's closing stock so that I can trust the inventory numbers and track stock accurately.

#### Acceptance Criteria

1. WHEN THE System calculates opening stock for a date, THE System SHALL use the closing stock from the previous date
2. WHEN THE System displays opening stock for the first date in the range, THE System SHALL calculate it based on all transactions before that date
3. WHEN THE System processes daily transactions, THE System SHALL apply them to the opening stock to calculate closing stock
4. WHEN THE System displays consecutive dates, THE System SHALL ensure each date's opening stock equals the previous date's closing stock
5. WHEN THE System encounters missing dates in the range, THE System SHALL carry forward the closing stock to the next available date's opening stock

### Requirement 2: Validate Stock Continuity

**User Story:** As a system administrator, I want the system to validate stock continuity between days so that any calculation errors are detected and logged.

#### Acceptance Criteria

1. WHEN THE System calculates daily stock, THE System SHALL verify that opening stock equals previous closing stock
2. WHEN THE System detects a stock continuity error, THE System SHALL log the discrepancy with date and stock details
3. WHEN THE System displays stock data, THE System SHALL highlight any dates with continuity issues
4. WHEN THE System calculates running stock, THE System SHALL maintain a single source of truth for stock balances
5. WHEN THE System processes transactions chronologically, THE System SHALL ensure no stock values are skipped or duplicated

### Requirement 3: Handle Date Range Filtering Correctly

**User Story:** As a mill operator, I want stock calculations to be accurate regardless of the date range I select so that I can view any time period without errors.

#### Acceptance Criteria

1. WHEN THE System filters by date range, THE System SHALL calculate opening stock for the first date based on all prior transactions
2. WHEN THE System filters by month, THE System SHALL calculate opening stock for the first day of the month based on all prior transactions
3. WHEN THE System displays filtered results, THE System SHALL maintain stock continuity within the filtered range
4. WHEN THE System changes date filters, THE System SHALL recalculate opening stock for the new range start date
5. WHEN THE System displays stock totals, THE System SHALL ensure opening and closing totals are consistent across all dates

### Requirement 4: Correct Running Stock Accumulation

**User Story:** As a data analyst, I want the running stock calculation to accurately accumulate transactions in chronological order so that the stock balances reflect reality.

#### Acceptance Criteria

1. WHEN THE System processes transactions, THE System SHALL sort them by date and creation time in ascending order
2. WHEN THE System encounters a kunchinittu transaction, THE System SHALL add the quantity to the running stock
3. WHEN THE System encounters a loading transaction, THE System SHALL subtract the quantity from the running stock
4. WHEN THE System calculates closing stock, THE System SHALL use the running stock after all transactions for that date
5. WHEN THE System carries forward stock to the next day, THE System SHALL use a deep copy of the closing stock object

### Requirement 5: Fix Stock Grouping Logic

**User Story:** As a mill operator, I want stock to be grouped correctly by product, packaging, location, and outturn so that different stock items don't get mixed up in calculations.

#### Acceptance Criteria

1. WHEN THE System groups opening stock, THE System SHALL group by product, packaging, bag size, and location
2. WHEN THE System groups closing stock, THE System SHALL maintain separate entries for different outturns of the same product
3. WHEN THE System displays stock items, THE System SHALL show all grouping attributes clearly
4. WHEN THE System calculates stock totals, THE System SHALL sum quantities across all groups correctly
5. WHEN THE System processes loading transactions, THE System SHALL match stock by product, packaging, bag size, and outturn (ignoring location)

### Requirement 6: Ensure Data Consistency in Response

**User Story:** As a frontend developer, I want the API response to have consistent opening and closing stock structures so that the UI can display them reliably.

#### Acceptance Criteria

1. WHEN THE System returns rice stock data, THE System SHALL include opening stock, daily transactions, and closing stock for each date
2. WHEN THE System calculates opening stock total, THE System SHALL sum all opening stock quantities
3. WHEN THE System calculates closing stock total, THE System SHALL sum all closing stock quantities
4. WHEN THE System formats stock items, THE System SHALL include all required fields (qtls, bags, bagSizeKg, product, packaging, location, outturn)
5. WHEN THE System returns empty stock, THE System SHALL return an empty array rather than null or undefined
