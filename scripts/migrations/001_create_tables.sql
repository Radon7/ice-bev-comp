-- Fuel price database for EC Oil Bulletin data
-- Stores weekly fuel prices for all EU countries since 2005

CREATE TABLE IF NOT EXISTS fuel_prices (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  country     TEXT NOT NULL,
  fuel_type   TEXT NOT NULL,
  price_eur_l NUMERIC(6,3) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, country, fuel_type)
);

CREATE INDEX IF NOT EXISTS idx_prices_country_fuel_date
  ON fuel_prices (country, fuel_type, date);

CREATE INDEX IF NOT EXISTS idx_prices_date
  ON fuel_prices (date);

-- Tracks refresh attempts for monitoring
CREATE TABLE IF NOT EXISTS refresh_log (
  id            BIGSERIAL PRIMARY KEY,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  rows_upserted INT,
  error         TEXT
);
