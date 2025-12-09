# Requirements Document

## Introduction

This document outlines the requirements for fixing two critical database constraint issues in the rice production system: (1) missing product types in the rice_productions table constraint, and (2) numeric overflow in the outturns yield_percentage field.

## Glossary

- **Rice Production System**: The application component that manages rice production records including product types and yield calculations
- **Product Type Constraint**: Database check constraint that validates allowed product type values in rice_productions table
- **Yield Percentage**: Calculated metric representing (Total By-Products / Total Net Weight) × 100
- **RJ Rice**: A new category of rice products including "RJ Rice 1" and "RJ Rice 2"
- **Bran**: A by-product type that should be allowed in rice production records

## Requirements

### Requirement 1

**User Story:** As a mill operator, I want to record RJ Rice 1, RJ Rice 2, and Bran products in rice production entries, so that I can accurately track all product types produced at the mill.

#### Acceptance Criteria

1. WHEN a user attempts to create a rice production record with productType "RJ Rice 1", THEN the Rice Production System SHALL accept and save the record without constraint violations.

2. WHEN a user attempts to create a rice production record with productType "RJ Rice 2", THEN the Rice Production System SHALL accept and save the record without constraint violations.

3. WHEN a user attempts to create a rice production record with productType "Bran", THEN the Rice Production System SHALL accept and save the record without constraint violations.

4. THE Rice Production System SHALL maintain backward compatibility with all existing product types: Rice, Farm Bran, Rejection Rice, Rejection Broken, Broken, Zero Broken, Faram, and Unpolished.

### Requirement 2

**User Story:** As a system administrator, I want the yield percentage field to handle all valid calculation results, so that the system does not crash when updating outturn records with high yield percentages.

#### Acceptance Criteria

1. WHEN the yield calculation produces a percentage value greater than 100, THEN the Rice Production System SHALL store the value without numeric overflow errors.

2. WHEN the yield calculation produces a percentage value up to 9999.99, THEN the Rice Production System SHALL store the value in the yield_percentage field.

3. THE Rice Production System SHALL update the yield_percentage field precision from DECIMAL(5,2) to DECIMAL(6,2) to accommodate values up to 9999.99.

4. THE Rice Production System SHALL preserve all existing yield_percentage values during the database schema update.
