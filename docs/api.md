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

If the API is unavailable, the simulation engine falls back to embedded historical data in `lib/historical-data.ts` (~1,000 weekly observations).

---

## GET /api/electricity-prices

Fetches live electricity prices from the Eurostat `nrg_pc_204` dataset.

**File**: `app/api/electricity-prices/route.ts`

### Response

```json
{
  "source": "eurostat_nrg_pc_204",
  "cached": false,
  "count": 35,
  "prices": [
    {
      "date": "2024-S1",
      "price": 0.2876
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Always `"eurostat_nrg_pc_204"` |
| `cached` | boolean | Whether the response came from cache |
| `stale` | boolean | Present and `true` when returning expired cache after a fetch failure |
| `count` | number | Number of price records |
| `prices` | ElectricityPricePoint[] | Semi-annual price records |

### Electricity Price Object

| Field | Type | Unit |
|-------|------|------|
| `date` | string | Period label (e.g. `"2024-S1"`, `"2023-S2"`) |
| `price` | number | EUR per kWh (all taxes included, 4 decimal places) |

### Data Source

The endpoint queries the Eurostat JSON API:
- **Dataset**: `nrg_pc_204` (electricity prices for household consumers)
- **Country**: Italy (`geo=IT`)
- **Unit**: EUR per kWh
- **Tax band**: All taxes included (`tax=I_TAX`)
- **Consumption band**: 2,500-4,999 kWh/year (`nrg_cons=KWH2500-4999`)
- **Timeout**: 30 seconds

### Caching

- Responses are cached in-memory for **24 hours**
- On fetch failure, stale cache is returned if available (with `stale: true` flag)
- Cache key is time-based (not request-based)

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Eurostat API unreachable | Returns stale cache if available; otherwise 502 |
| Parse error | Returns stale cache if available; otherwise 502 |
| No cached data | Returns error JSON with status 502 |

### Fallback

If the API is unavailable, the simulation engine falls back to embedded historical data in `lib/historical-electricity-data.ts` (35 semi-annual observations since 2008).
