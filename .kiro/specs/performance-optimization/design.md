# Performance Optimization Design Document

## Overview

This design document outlines the technical approach to optimize the Mother India Stock Management System for handling 300,000+ records with API response times under 100ms. The current system suffers from:

- **Slow API responses** (400+ ms average)
- **N+1 query problems** in multiple endpoints
- **Missing database indexes** for common query patterns
- **No caching strategy** for frequently accessed data
- **Redundant code** and unused files
- **Inefficient stock calculations** loading all records into memory
- **Suboptimal connection pooling**

The optimization will focus on database query optimization, caching implementation, code cleanup, and architectural improvements while maintaining backward compatibility.

## Architecture

### Current Architecture Issues

```
Client → Express API → Sequelize ORM → PostgreSQL
         ↓
         Multiple N+1 queries per request
         No caching layer
         Inefficient aggregations
         Missing composite indexes
```

### Optimized Architecture

```
Client → Express API → Redis Cache → Sequelize ORM → PostgreSQL
         ↓              ↓                              ↓
         Cached         Cache Miss                    Optimized queries
         Response       ↓                              Composite indexes
                        Query DB → Update Cache        Raw SQL for aggregations
                                                       Connection pooling
```

### Key Architectural Changes

1. **Caching Layer**: Redis for frequently accessed data (dashboard stats, location lists, outturn lists)
2. **Query Optimization**: Raw SQL for complex aggregations, eager loading for associations
3. **Database Indexes**: Composite indexes for multi-column filters
4. **Connection Pooling**: Optimized pool configuration for concurrent requests
5. **Response Compression**: Gzip compression for large payloads

## Components and Interfaces

### 1. Cache Service (`server/services/cacheService.js`)

**Purpose**: Centralized caching logic using Redis

**Interface**:
```javascript
class CacheService {
  async get(key)
  async set(key, value, ttl)
  async del(key)
  async delPattern(pattern)
  async exists(key)
}
```

**Cache Keys**:
- `dashboard:stats` - TTL: 120s
- `locations:warehouses` - TTL: 300s
- `locations:kunchinittus` - TTL: 300s
- `locations:varieties` - TTL: 300s
- `outturns:list` - TTL: 120s
- `stock:variety:{variety}` - TTL: 60s

**Cache Invalidation**:
- On arrival creation/update/delete → Clear `dashboard:stats`, `stock:*`
- On location creation/update → Clear `locations:*`
- On outturn creation/update → Clear `outturns:*`

### 2. Query Optimization Service (`server/services/queryOptimizationService.js`)

**Purpose**: Reusable optimized queries for common operations

**Interface**:
```javascript
class QueryOptimizationService {
  async getStockByVariety(variety, options)
  async getStockByKunchinittu(kunchinintuId, options)
  async getDashboardStats(businessDate)
  async getArrivalsWithPagination(filters, page, limit)
  async bulkApproveArrivals(arrivalIds, userId, role)
}
```

**Optimization Techniques**:
- Use raw SQL with CTEs for complex calculations
- Batch operations in transactions
- Limit result sets with indexed ORDER BY
- Use COUNT(*) optimization for pagination

### 3. Database Index Manager (`server/migrations/add_comprehensive_indexes.js`)

**Purpose**: Add missing composite indexes for query optimization

**New Indexes**:
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_arrivals_status_admin_date ON arrivals(status, "adminApprovedBy", date);
CREATE INDEX idx_arrivals_movement_outturn_status ON arrivals("movementType", "outturnId", status);
CREATE INDEX idx_arrivals_variety_status_date ON arrivals(variety, status, date);
CREATE INDEX idx_arrivals_kunchinittu_status_movement ON arrivals("toKunchinintuId", status, "movementType");

-- Covering indexes for pagination
CREATE INDEX idx_arrivals_date_id_covering ON arrivals(date DESC, id DESC) INCLUDE (bags, "netWeight", variety);

-- Partial indexes for specific queries
CREATE INDEX idx_arrivals_approved_admin ON arrivals(status, "adminApprovedBy") WHERE status = 'approved' AND "adminApprovedBy" IS NOT NULL;
```

### 4. Performance Monitoring Middleware (Enhanced)

**Purpose**: Track and log slow queries with detailed metrics

**Enhancements**:
```javascript
// Add query tracking
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Track database queries
  let queryCount = 0;
  const originalQuery = sequelize.query;
  sequelize.query = function(...args) {
    queryCount++;
    return originalQuery.apply(this, args);
  };
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;
    
    // Log metrics
    console.log({
      method: req.method,
      url: req.originalUrl,
      responseTime: `${responseTime}ms`,
      queryCount,
      memoryUsed: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
      statusCode: res.statusCode
    });
  });
  
  next();
};
```

## Data Models

### No Schema Changes Required

The existing schema is well-designed with proper foreign keys and indexes. We will:
- Add composite indexes for multi-column queries
- Add partial indexes for filtered queries
- Add covering indexes for pagination

### Query Pattern Analysis

**Most Frequent Queries**:
1. Stock calculations by variety (50+ times/day)
2. Dashboard statistics (100+ times/day)
3. Arrivals list with pagination (200+ times/day)
4. Kunchinittu ledger (30+ times/day)
5. Outturn list (80+ times/day)

**Optimization Strategy**:
- Cache dashboard stats and outturn lists
- Use raw SQL for stock calculations
- Optimize pagination with covering indexes
- Eager load associations to avoid N+1

## Error Handling

### Cache Failures

**Strategy**: Graceful degradation - if cache fails, query database directly

```javascript
async function getCachedData(key, fetchFunction, ttl) {
  try {
    const cached = await cacheService.get(key);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.warn('Cache read failed:', error.message);
  }
  
  // Fetch from database
  const data = await fetchFunction();
  
  // Try to cache (non-blocking)
  cacheService.set(key, JSON.stringify(data), ttl).catch(err => {
    console.warn('Cache write failed:', err.message);
  });
  
  return data;
}
```

### Query Timeouts

**Strategy**: Set statement timeout and handle gracefully

```javascript
// In database config
dialectOptions: {
  statement_timeout: 30000, // 30 seconds
}

// In route handlers
try {
  const results = await query();
} catch (error) {
  if (error.name === 'SequelizeTimeoutError') {
    return res.status(504).json({ 
      error: 'Query timeout - please refine your filters',
      suggestion: 'Try narrowing the date range or adding more filters'
    });
  }
  throw error;
}
```

### Connection Pool Exhaustion

**Strategy**: Monitor pool usage and queue requests

```javascript
// Monitor pool stats
setInterval(() => {
  const pool = sequelize.connectionManager.pool;
  console.log('Pool stats:', {
    size: pool.size,
    available: pool.available,
    using: pool.using,
    waiting: pool.waiting
  });
  
  if (pool.waiting > 5) {
    console.warn('⚠️ High connection wait queue:', pool.waiting);
  }
}, 60000); // Every minute
```

## Testing Strategy

### Performance Benchmarks

**Target Metrics**:
- API response time < 100ms for 50 records
- API response time < 300ms for 500 records
- API response time < 1000ms for 5000 records
- Database query time < 50ms for indexed queries
- Cache hit rate > 80% for frequently accessed data

**Load Testing**:
```bash
# Use Apache Bench for load testing
ab -n 1000 -c 10 http://localhost:5000/api/dashboard/stats
ab -n 1000 -c 10 http://localhost:5000/api/arrivals?limit=50
ab -n 500 -c 5 http://localhost:5000/api/records/stock?limit=100
```

### Query Performance Testing

**Test Queries**:
```sql
-- Test stock calculation performance
EXPLAIN ANALYZE
SELECT 
  variety,
  SUM(CASE WHEN "toKunchinintuId" IS NOT NULL THEN bags ELSE 0 END) as inward,
  SUM(CASE WHEN "fromKunchinintuId" IS NOT NULL THEN bags ELSE 0 END) as outward
FROM arrivals
WHERE status = 'approved' AND "adminApprovedBy" IS NOT NULL
GROUP BY variety;

-- Test pagination performance
EXPLAIN ANALYZE
SELECT * FROM arrivals
WHERE status = 'approved'
ORDER BY date DESC, id DESC
LIMIT 50 OFFSET 0;
```

### Cache Testing

**Test Scenarios**:
1. Cache hit - verify data returned from cache
2. Cache miss - verify data fetched from DB and cached
3. Cache invalidation - verify cache cleared on write operations
4. Cache failure - verify graceful degradation to database

### Integration Testing

**Test Cases**:
1. Create arrival → Verify cache invalidation → Verify dashboard stats updated
2. Bulk approve arrivals → Verify transaction rollback on error
3. Stock calculation with 300K+ records → Verify response time < 1s
4. Concurrent requests → Verify no connection pool exhaustion

## Optimization Details

### 1. Dashboard Stats Optimization

**Current Implementation** (Slow):
```javascript
// Loads all records into memory
const stockTransactions = await Arrival.findAll({
  where: { status: 'approved' }
});
// Then calculates in JavaScript
```

**Optimized Implementation**:
```javascript
// Use raw SQL with aggregation
const [stats] = await sequelize.query(`
  WITH stock_summary AS (
    SELECT 
      SUM(CASE WHEN "toKunchinintuId" IS NOT NULL THEN "netWeight" ELSE 0 END) as inward,
      SUM(CASE WHEN "fromKunchinintuId" IS NOT NULL THEN "netWeight" ELSE 0 END) as outward
    FROM arrivals
    WHERE status = 'approved' AND "adminApprovedBy" IS NOT NULL
  )
  SELECT (inward - outward) as total_stock FROM stock_summary
`);

// Cache for 2 minutes
await cacheService.set('dashboard:stats', JSON.stringify(stats), 120);
```

**Performance Gain**: 400ms → 50ms (8x faster)

### 2. Arrivals List Optimization

**Current Implementation** (N+1 Problem):
```javascript
const arrivals = await Arrival.findAll({
  include: [
    { model: User, as: 'creator' },
    { model: User, as: 'approver' },
    // ... 8 more associations
  ]
});
// Generates 10+ queries
```

**Optimized Implementation**:
```javascript
// Use subQuery: false to avoid N+1
const arrivals = await Arrival.findAll({
  include: [
    { model: User, as: 'creator', attributes: ['username'], required: false },
    { model: User, as: 'approver', attributes: ['username'], required: false },
    // ... other associations
  ],
  subQuery: false,
  limit: 50,
  offset: (page - 1) * 50
});
// Generates 1-2 queries with JOINs
```

**Performance Gain**: 300ms → 80ms (3.75x faster)

### 3. Stock Calculation Optimization

**Current Implementation** (Very Slow):
```javascript
// Loads all arrivals
const arrivals = await Arrival.findAll({
  where: { variety: 'SONA MASOORI' }
});

// Calculates in JavaScript
let stock = 0;
arrivals.forEach(a => {
  if (a.toKunchinintuId) stock += a.bags;
  if (a.fromKunchinintuId) stock -= a.bags;
});
```

**Optimized Implementation**:
```javascript
// Use CTE with aggregation
const [stockData] = await sequelize.query(`
  WITH inward AS (
    SELECT 
      "toKunchinintuId" as kunchinittu_id,
      COALESCE("toWarehouseId", "toWarehouseShiftId") as warehouse_id,
      SUM(bags) as inward_bags
    FROM arrivals
    WHERE UPPER(TRIM(variety)) = :variety
      AND status = 'approved'
      AND "adminApprovedBy" IS NOT NULL
      AND "toKunchinintuId" IS NOT NULL
    GROUP BY "toKunchinintuId", COALESCE("toWarehouseId", "toWarehouseShiftId")
  ),
  outward AS (
    SELECT 
      "fromKunchinintuId" as kunchinittu_id,
      "fromWarehouseId" as warehouse_id,
      SUM(bags) as outward_bags
    FROM arrivals
    WHERE UPPER(TRIM(variety)) = :variety
      AND status = 'approved'
      AND "adminApprovedBy" IS NOT NULL
      AND "fromKunchinintuId" IS NOT NULL
      AND "movementType" IN ('shifting', 'production-shifting')
    GROUP BY "fromKunchinintuId", "fromWarehouseId"
  )
  SELECT 
    COALESCE(i.kunchinittu_id, o.kunchinittu_id) as kunchinittu_id,
    COALESCE(i.warehouse_id, o.warehouse_id) as warehouse_id,
    (COALESCE(i.inward_bags, 0) - COALESCE(o.outward_bags, 0)) as stock_bags
  FROM inward i
  FULL OUTER JOIN outward o 
    ON i.kunchinittu_id = o.kunchinittu_id 
    AND i.warehouse_id = o.warehouse_id
  WHERE (COALESCE(i.inward_bags, 0) - COALESCE(o.outward_bags, 0)) > 0
`, {
  replacements: { variety: 'SONA MASOORI' },
  type: QueryTypes.SELECT
});
```

**Performance Gain**: 800ms → 100ms (8x faster)

### 4. Bulk Operations Optimization

**Current Implementation** (Slow):
```javascript
// Sequential updates
for (const id of arrivalIds) {
  const arrival = await Arrival.findByPk(id);
  await arrival.update({ status: 'approved' });
}
```

**Optimized Implementation**:
```javascript
// Batch update in transaction
const transaction = await sequelize.transaction();
try {
  await Arrival.update(
    { 
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date()
    },
    {
      where: { id: { [Op.in]: arrivalIds } },
      transaction
    }
  );
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

**Performance Gain**: 100 records: 5s → 0.5s (10x faster)

## Code Cleanup Plan

### Files to Delete

**Unused Routes**:
- `server/routes/export_temp.js` - Temporary file, superseded by export.js

**Redundant Migrations**:
- Keep only the latest version of each migration
- Document which migrations have been applied

**Unused Dependencies**:
```json
// To be removed from package.json after verification
{
  "dependencies": {
    // Verify if these are actually used:
    "csv-parser": "^3.0.0",  // Only used in one place, can be replaced
    "pdfkit": "^0.14.0"      // Used, keep
  }
}
```

### Code Consolidation

**Duplicate Query Logic**:
- Extract common stock calculation logic to `queryOptimizationService.js`
- Extract common validation logic to `validators/` directory
- Extract common response formatting to `utils/responseFormatter.js`

**Commented Code**:
- Remove all commented-out code blocks
- Keep only meaningful comments explaining business logic

## Implementation Phases

### Phase 1: Database Optimization (Week 1)
1. Add composite indexes
2. Add partial indexes
3. Add covering indexes for pagination
4. Optimize connection pool configuration

### Phase 2: Query Optimization (Week 1-2)
1. Implement QueryOptimizationService
2. Replace N+1 queries with eager loading
3. Convert complex calculations to raw SQL
4. Optimize pagination queries

### Phase 3: Caching Implementation (Week 2)
1. Set up Redis
2. Implement CacheService
3. Add caching to dashboard stats
4. Add caching to location lists
5. Add caching to outturn lists
6. Implement cache invalidation

### Phase 4: Code Cleanup (Week 2-3)
1. Remove unused files
2. Consolidate duplicate code
3. Remove commented code
4. Update documentation

### Phase 5: Testing & Monitoring (Week 3)
1. Performance benchmarking
2. Load testing
3. Query performance testing
4. Cache hit rate monitoring
5. Connection pool monitoring

## Monitoring and Metrics

### Key Performance Indicators

1. **API Response Time**
   - P50 (median): < 100ms
   - P95: < 300ms
   - P99: < 1000ms

2. **Database Query Time**
   - Average: < 50ms
   - P95: < 200ms
   - P99: < 500ms

3. **Cache Hit Rate**
   - Dashboard stats: > 90%
   - Location lists: > 85%
   - Outturn lists: > 80%

4. **Connection Pool**
   - Average utilization: < 60%
   - Peak utilization: < 80%
   - Wait queue: < 5

### Monitoring Tools

**Application Metrics**:
- Enhanced performance monitor middleware
- Custom metrics endpoint `/api/metrics`

**Database Metrics**:
- PostgreSQL slow query log
- pg_stat_statements extension
- Connection pool statistics

**Cache Metrics**:
- Redis INFO command
- Cache hit/miss ratio
- Cache memory usage

## Rollback Plan

### If Performance Degrades

1. **Disable caching**: Set `CACHE_ENABLED=false` in environment
2. **Revert indexes**: Run down migrations for new indexes
3. **Revert query changes**: Git revert specific commits
4. **Monitor**: Check if performance returns to baseline

### Database Rollback

```sql
-- Remove new indexes if they cause issues
DROP INDEX IF EXISTS idx_arrivals_status_admin_date;
DROP INDEX IF EXISTS idx_arrivals_movement_outturn_status;
-- ... other indexes
```

### Cache Rollback

```javascript
// Disable cache in config
const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';

// Wrapper function
async function getCachedOrFetch(key, fetchFn, ttl) {
  if (!CACHE_ENABLED) return fetchFn();
  // ... cache logic
}
```

## Success Criteria

1. ✅ API response time reduced from 400ms to < 100ms for typical queries
2. ✅ System handles 300,000+ records without performance degradation
3. ✅ Dashboard loads in < 200ms
4. ✅ Stock calculations complete in < 500ms
5. ✅ Bulk operations (100 records) complete in < 2s
6. ✅ Cache hit rate > 80% for frequently accessed data
7. ✅ No N+1 query problems in any endpoint
8. ✅ Connection pool utilization < 80% under normal load
9. ✅ All unused code and files removed
10. ✅ Comprehensive performance monitoring in place
