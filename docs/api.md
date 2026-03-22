# API Reference

## GET /api/prices

Fetches live fuel prices from the European Commission Oil Bulletin.

**File**: `app/api/prices/route.ts`

### Response

```json
{
  "source": "ec_oil_bulletin",
  "cached": false,
  "count": 52,
  "prices": [
    {
      "date": "2025-03-10",
      "euro95": 1.802,
      "diesel": 1.704
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Always `"ec_oil_bulletin"` |
| `cached` | boolean | Whether the response came from cache |
| `count` | number | Number of price records |
| `prices` | PriceData[] | Weekly price records |

### Price Data Object

| Field | Type | Unit |
|-------|------|------|
| `date` | string | ISO date (YYYY-MM-DD) |
| `euro95` | number | EUR per liter |
| `diesel` | number | EUR per liter |

### Data Source

The endpoint downloads an Excel file from the EC Oil Bulletin:
- **Sheet**: "Prices with taxes"
- **Country**: Italy (columns 128-129)
- **Conversion**: Raw data is in EUR/1000L, divided by 1000 to get EUR/L

### Caching

- Responses are cached in-memory for **24 hours**
- On fetch failure, stale cache is returned if available
- Cache key is time-based (not request-based)

### Error Handling

| Scenario | Behavior |
|----------|----------|
| EC site unreachable | Returns stale cache if available; otherwise 500 |
| Parse error | Returns stale cache if available; otherwise 500 |
| No cached data | Returns error JSON with status 500 |

### Fallback

If the API is unavailable, the simulation engine falls back to embedded historical data in `lib/historical-data.ts` (52-week snapshot).
