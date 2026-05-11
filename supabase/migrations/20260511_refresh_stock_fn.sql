-- Creates the refresh_stock() function the API calls after every movement write.
-- The stock materialized view is derived from the movements ledger; it must be
-- refreshed explicitly because Postgres does not auto-refresh materialized views.

CREATE OR REPLACE FUNCTION refresh_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stock;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_stock() TO service_role;
