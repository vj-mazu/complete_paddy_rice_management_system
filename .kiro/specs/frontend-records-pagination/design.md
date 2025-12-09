# Design Document

## Overview

This design implements month-wise pagination UI controls for the Records tab frontend. The backend already provides month-wise pagination through the `month` query parameter and returns `availableMonths` in the response. We will add a month selector dropdown to the existing filter section and integrate it with the current data fetching logic.

## Architecture

### Component Structure

The Records.tsx component will be enhanced with:
- Month selector dropdown in the FilterSection
- State management for selected month and available months
- Updated API calls to include month parameter
- Visual indicators for current month selection

### Data Flow

1. **Initial Load**: Component fetches records without month filter (uses existing date filters)
2. **Month Selection**: User selects month → State updates → API call with month parameter → Records update
3. **Month Clear**: User clears selection → State resets → API call without month parameter → Records update
4. **Tab Switch**: Selected month persists or resets based on tab context

### API Integration

The backend endpoints already support:
- `/records/arrivals?month=YYYY-MM`
- `/records/purchase?month=YYYY-MM`
- `/records/shifting?month=YYYY-MM`
- `/records/stock?month=YYYY-MM`

Response format:
```typescript
{
  records: { [date: string]: Arrival[] },
  pagination: {
    currentMonth: string | null,
    availableMonths: Array<{ month: string, month_label: string }>,
    totalRecords: number
  }
}
```

## Components and Interfaces

### State Management

Add to Records component:

```typescript
// Month-wise pagination state
const [selectedMonth, setSelectedMonth] = useState<string>('');
const [availableMonths, setAvailableMonths] = useState<Array<{ month: string; month_label: string }>>([]);
```

### UI Components

#### Month Selector Dropdown

Location: Inside FilterSection, alongside existing date filters

```typescript
<FormGroup>
  <Label>Filter by Month</Label>
  <Select
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(e.target.value)}
  >
    <option value="">All Months</option>
    {availableMonths.map((m) => (
      <option key={m.month} value={m.month}>
        {m.month_label}
      </option>
    ))}
  </Select>
  <InfoText>Select a month to view records, or leave blank to use date range filters</InfoText>
</FormGroup>
```

#### Current Filter Indicator

Add below the filter section when a month is selected:

```typescript
{selectedMonth && (
  <div style={{
    background: '#e0f2fe',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <span>
      📅 Showing records for: <strong>{availableMonths.find(m => m.month === selectedMonth)?.month_label}</strong>
      {' '}({Object.keys(records).length} days, {Object.values(records).flat().length} records)
    </span>
    <Button
      className="secondary"
      onClick={() => setSelectedMonth('')}
      style={{ padding: '0.5rem 1rem' }}
    >
      Clear Filter
    </Button>
  </div>
)}
```

## Data Models

### TypeScript Interfaces

```typescript
interface MonthOption {
  month: string; // Format: YYYY-MM
  month_label: string; // Format: "January 2024"
}

interface PaginationData {
  currentMonth: string | null;
  availableMonths: MonthOption[];
  totalRecords: number;
}

interface RecordsResponse {
  records: { [date: string]: Arrival[] };
  pagination: PaginationData;
}
```

## Implementation Details

### fetchRecords Function Update

Modify the existing `fetchRecords` function:

```typescript
const fetchRecords = async () => {
  setLoading(true);
  try {
    const params: any = {};
    
    // Priority: month filter > date range filters
    if (selectedMonth) {
      params.month = selectedMonth;
    } else {
      // Business Date logic: If not showing all records and no manual date filter
      if (!showAllRecords && !dateFrom && !dateTo) {
        const businessDate = getBusinessDate();
        params.dateFrom = businessDate;
        params.dateTo = businessDate;
      } else {
        if (dateFrom) params.dateFrom = convertDateFormat(dateFrom);
        if (dateTo) params.dateTo = convertDateFormat(dateTo);
      }
    }
    
    if (search) params.search = search;

    const endpoint = activeTab === 'arrivals' ? '/records/arrivals' : 
                    activeTab === 'purchase' ? '/records/purchase' :
                    activeTab === 'shifting' ? '/records/shifting' : '/records/stock';

    const response = await axios.get(endpoint, { params });
    const data = response.data as RecordsResponse;
    
    // Update records
    setRecords(data.records || {});
    
    // Update available months
    if (data.pagination?.availableMonths) {
      setAvailableMonths(data.pagination.availableMonths);
    }
    
    // Auto-expand logic...
  } catch (error) {
    console.error('Error fetching records:', error);
    toast.error('Failed to fetch records');
  } finally {
    setLoading(false);
  }
};
```

### useEffect Dependencies

Update the useEffect to trigger on month selection:

```typescript
useEffect(() => {
  fetchRecords();
}, [activeTab, page, dateFrom, dateTo, search, showAllRecords, selectedMonth]);
```

### Tab Switching Behavior

When switching tabs, reset the month filter:

```typescript
const handleTabChange = (tab: typeof activeTab) => {
  setActiveTab(tab);
  setSelectedMonth(''); // Reset month filter on tab change
  setRecords({});
};
```

## Error Handling

### Graceful Degradation

1. **No Available Months**: If backend doesn't return months, hide the month selector
2. **API Errors**: Show toast notification, keep existing records displayed
3. **Empty Results**: Show appropriate empty state message

```typescript
{availableMonths.length === 0 && (
  <InfoText style={{ color: '#f59e0b' }}>
    Month filter unavailable. Please use date range filters.
  </InfoText>
)}
```

### Error States

```typescript
try {
  // API call
} catch (error) {
  console.error('Error fetching records:', error);
  toast.error('Failed to fetch records');
  // Don't clear existing records - allow user to retry
}
```

## Testing Strategy

### Manual Testing Checklist

1. **Month Selection**
   - Select different months and verify correct records load
   - Verify month label displays correctly
   - Verify record counts are accurate

2. **Filter Integration**
   - Test month filter with date range filters
   - Verify month filter takes priority
   - Test clearing month filter

3. **Tab Switching**
   - Switch between tabs and verify month filter resets
   - Verify available months update per tab

4. **Error Scenarios**
   - Test with no available months
   - Test with API errors
   - Test with empty month results

5. **UI/UX**
   - Verify loading states
   - Verify empty states
   - Verify visual consistency across tabs

### Edge Cases

1. **No Records for Month**: Display empty state with helpful message
2. **Backend Returns No Months**: Hide month selector, show info message
3. **Network Timeout**: Show error, allow retry
4. **Rapid Tab Switching**: Ensure no race conditions in API calls

## Performance Considerations

### Optimization Strategies

1. **Debouncing**: Not needed for dropdown selection (single action)
2. **Caching**: Consider caching available months per tab
3. **Lazy Loading**: Month selector only renders when data is available
4. **Request Cancellation**: Cancel pending requests on tab switch

### Performance Metrics

- Month selector should render instantly (<50ms)
- API calls should complete within 2 seconds
- UI should remain responsive during loading

## Accessibility

- Month selector dropdown is keyboard navigable
- Clear labels for screen readers
- Focus management on month selection
- ARIA labels for current filter indicator

## Browser Compatibility

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses standard HTML select element (no custom dropdown needed)
- Graceful degradation for older browsers
