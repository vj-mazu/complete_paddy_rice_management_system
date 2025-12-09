# Implementation Plan

- [x] 1. Add cleared outturn filter to opening production shifting stock


  - Locate the section in `client/src/pages/Records.tsx` where opening stock is calculated (around line 3100)
  - Find where `openingProductionShifting` is set from the previous day's closing stock
  - Immediately after the opening stock is set, add the cleared outturn filter logic
  - Copy the existing filter logic from closing stock (lines 3137-3154) and adapt it for opening stock
  - Use `Object.keys(openingProductionShifting).forEach()` to iterate through opening production shifting items
  - For each item, search `allRiceProductions` for a CLEARING entry matching the outturn code
  - Check if `clearingEntry.date <= date` to determine if the outturn was cleared on or before the current date
  - Delete the item from `openingProductionShifting` if it was cleared
  - Add console.log statements to track when cleared outturns are removed from opening stock
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Verify stock continuity across days



  - Open the Paddy Stock tab in the Records page
  - Select a kunchinittu that has cleared outturns
  - View a date range that includes the clearing date and subsequent dates
  - Verify that the cleared outturn appears in opening stock before the clearing date
  - Verify that the cleared outturn does NOT appear in closing stock on the clearing date
  - Verify that the cleared outturn does NOT appear in opening stock on dates after the clearing date
  - Check browser console logs to confirm filtering messages appear for both opening and closing stock
  - Verify that Day N's closing total equals Day N+1's opening total for all dates
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_


- [ ] 3. Test with multiple outturns and clearing scenarios
  - Test with a kunchinittu that has multiple active outturns
  - Clear one outturn and verify only that outturn is filtered
  - Verify other outturns continue to appear in opening and closing stock
  - Test with an outturn cleared on the first date of the view range
  - Test with an outturn cleared on the last date of the view range
  - Test with an outturn cleared in the middle of the view range
  - Verify the filtering works correctly for all scenarios
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4_



- [ ] 4. Verify console logging and debugging
  - Check browser console for opening stock filtering messages
  - Verify messages include: date, outturn code, clearing date
  - Verify messages match the format of closing stock filtering messages
  - Confirm no JavaScript errors appear in the console
  - Verify the filtering logic doesn't break any other stock calculations
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
