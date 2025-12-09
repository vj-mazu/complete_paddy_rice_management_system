# Requirements Document

## Introduction

This feature addresses a display bug in the Paddy Stock tab within the Records page. When an outturn is cleared (all paddy bags consumed and outturn closed), it should no longer appear in the opening stock bifurcation on subsequent days. Currently, cleared outturns are filtered from the closing stock but continue to appear in the next day's opening stock bifurcation, causing confusion for users who see stock for outturns that should be closed.

## Glossary

- **Paddy Stock Tab**: The stock tracking view within the Records page that shows daily opening/closing stock
- **Bifurcation**: The detailed breakdown of stock showing individual entries by variety, kunchinittu, and outturn
- **Opening Stock**: The stock available at the start of a business day
- **Closing Stock**: The stock available at the end of a business day
- **Cleared Outturn**: An outturn that has been officially closed via a CLEARING entry in rice production
- **Production Shifting Stock**: Paddy bags that have been shifted to production (assigned to an outturn)
- **CLEARING Entry**: A special rice production entry with locationCode 'CLEARING' that marks an outturn as closed
- **Opening Production Shifting**: The production shifting stock carried forward from the previous day's closing

## Requirements

### Requirement 1

**User Story:** As a mill manager viewing the Paddy Stock tab, I want cleared outturns to be excluded from the opening stock bifurcation, so that I only see active outturns with available bags

#### Acceptance Criteria

1. WHEN the Paddy Stock tab calculates opening stock for a date, THE Records Page SHALL exclude cleared outturns from the opening production shifting stock
2. WHEN an outturn has a CLEARING entry on or before a specific date, THE Records Page SHALL not display that outturn in the opening bifurcation for that date
3. WHEN an outturn has a CLEARING entry on or before a specific date, THE Records Page SHALL not display that outturn in the opening bifurcation for any subsequent dates
4. WHEN calculating opening stock, THE Records Page SHALL check all rice productions for CLEARING entries with locationCode equal to 'CLEARING'

### Requirement 2

**User Story:** As a production operator, I want the opening stock to match the previous day's closing stock, so that I can trust the stock continuity

#### Acceptance Criteria

1. WHEN viewing consecutive days in the Paddy Stock tab, THE Records Page SHALL ensure that Day N's closing stock equals Day N+1's opening stock
2. WHEN an outturn is cleared on Day N, THE Records Page SHALL exclude it from Day N's closing stock
3. WHEN an outturn is cleared on Day N, THE Records Page SHALL exclude it from Day N+1's opening stock
4. WHEN calculating opening stock from previous closing, THE Records Page SHALL apply the same cleared outturn filter used for closing stock

### Requirement 3

**User Story:** As a data analyst, I want consistent filtering logic for cleared outturns across opening and closing stock, so that stock calculations are accurate

#### Acceptance Criteria

1. WHEN filtering cleared outturns, THE Records Page SHALL use the same logic for both opening and closing stock calculations
2. WHEN checking if an outturn is cleared, THE Records Page SHALL search for rice production entries with locationCode equal to 'CLEARING'
3. WHEN an outturn has multiple CLEARING entries, THE Records Page SHALL use the earliest CLEARING date
4. WHEN comparing dates for clearing, THE Records Page SHALL use date string comparison (YYYY-MM-DD format)
