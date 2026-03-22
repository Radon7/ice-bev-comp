-- Electricity prices from Eurostat (semi-annual, all EU countries)
CREATE TABLE IF NOT EXISTS electricity_prices (
  id            BIGSERIAL PRIMARY KEY,
  date          TEXT NOT NULL,             -- Semi-annual: '2024-S1', '2024-S2'
  country       TEXT NOT NULL,             -- ISO 2-letter (IT, DE, FR...)
  price_eur_kwh NUMERIC(8,4) NOT NULL,    -- EUR per kWh (4 decimals)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, country)
);

CREATE INDEX IF NOT EXISTS idx_elec_country_date
  ON electricity_prices (country, date);

-- Add source column to refresh_log to distinguish fuel vs electricity refreshes
ALTER TABLE refresh_log ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'fuel_prices';
