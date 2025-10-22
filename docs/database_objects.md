# Database objects — skynest_schema.sql

Generated from `skynest_schema.sql` (dump dated 2025-10-18).

This document summarizes extensions, custom types, functions (SQL & PL/pgSQL), stored procedures (functions returning TABLE), triggers and trigger functions, views, and important table constraints found in the schema.

## Summary

- Extensions: 1
- Custom ENUM types: 6
- SQL functions: 8 (utility and aggregates)
- PL/pgSQL functions (procedural): 4 (including a stored-procedure-style function returning TABLE)
- Trigger functions: 3 (each has an associated trigger)
- Views: 5
- Important CHECK constraints and generated columns noted where relevant

---

## Extensions

### btree_gist
- Location: public schema
- Installed with: `CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;`
- Purpose: support GiST indexing of many common datatypes (useful for exclusion constraints or advanced indexes)
- Comment: "support for indexing common datatypes in GiST"


## Custom ENUM types
The schema defines several ENUM types used by tables and constraints:

- `public.adjustment_type` — values: `refund`, `chargeback`, `manual_adjustment`
- `public.booking_status` — values: `Booked`, `Checked-In`, `Checked-Out`, `Cancelled`
- `public.payment_method` — values: `Cash`, `Card`, `Online`, `BankTransfer`
- `public.prebooking_method` — values: `Online`, `Phone`, `Walk-in`
- `public.room_status` — values: `Available`, `Occupied`, `Maintenance`
- `public.user_role` — values: `Admin`, `Manager`, `Receptionist`, `Accountant`, `Customer`

These are used by `booking.status`, `payment.method`, `pre_booking.prebooking_method`, `room.status`, and `user_account.role`.


## Functions (SQL and IMMUTABLE/ STABLE)

The schema provides several small SQL functions used by views and business logic.

1) `public.fn_balance_due(p bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Returns rounded bill total minus total paid: ROUND(fn_bill_total(p) - fn_total_paid(p), 2)
- Usage: reporting and invoice calculations

2) `public.fn_bill_total(p_booking_id bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Computes room charges + services + late fees - discount, then applies tax_rate_percent
- Uses `fn_room_charges` and `fn_service_charges` helpers

3) `public.fn_net_balance(p_booking_id bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Returns rounded net balance using bill total, total paid and total refunds

4) `public.fn_room_charges(p_booking_id bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Calculates nights × booked_rate

5) `public.fn_service_charges(p_booking_id bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Sums service_usage.qty * unit_price_at_use

6) `public.fn_total_paid(p_booking_id bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Sums payments for a booking

7) `public.fn_total_refunds(p_booking_id bigint) RETURNS numeric` (LANGUAGE sql, STABLE)
- Sums payment_adjustment amounts of types `refund` or `chargeback`

8) `public.randn(p numeric) RETURNS numeric` (LANGUAGE sql, IMMUTABLE)
- Utility wrapper around random() scaled by the input parameter


## Stored-procedure-style function (PL/pgSQL)

1) `public.sp_cancel_booking(p_booking_id bigint, p_reference_note character varying DEFAULT NULL) RETURNS TABLE(...)` (LANGUAGE plpgsql)
- Purpose: cancel a booking, compute cancellation fee and refund, insert payment_adjustment rows for refund when needed, update booking.status to `Cancelled`, and return a summary row with booking_id, bill_total, total_paid, cancellation_fee, refund_amount, and status_after
- Key business rules embedded:
  - If check-in is ≥ 2 days away, no fee; otherwise 10% cancellation fee on bill
  - Refund is min(total_paid, bill_total - fee)
  - Inserts a `payment_adjustment` with type `refund` if refund > 0
  - Idempotent update to `status = 'Cancelled'`


## Trigger functions (PL/pgSQL) and triggers

Three trigger functions, each paired with a trigger on `public.booking`:

1) `public.trg_check_min_advance() RETURNS trigger`
- Fired BEFORE INSERT OR UPDATE OF `check_in_date, check_out_date, booked_rate, advance_payment` on `public.booking`
- Ensures `advance_payment` is at least 10% of room charges (nights × rate). If not, raises a check_violation exception (ERRCODE '23514').
- Associated trigger: `booking_min_advance_guard` (BEFORE INSERT OR UPDATE ... EXECUTE FUNCTION public.trg_check_min_advance())

2) `public.trg_refund_advance_on_cancel() RETURNS trigger`
- Fired AFTER UPDATE OF status on `public.booking`
- When booking status changes to `Cancelled`, inserts a `payment_adjustment` for the full `advance_payment` amount (if > 0) marked `refund` with note 'Auto refund of advance on cancel'
- Associated trigger: `refund_advance_on_cancel`

3) `public.trg_refund_advance_policy() RETURNS trigger`
- Fired AFTER UPDATE OF status on `public.booking`
- When status changes to `Cancelled`, applies policy: if check-in ≥ 2 days away, full advance refund; else 10% fee on advance and refund the remainder. Inserts `payment_adjustment` with appropriate reference_note
- Associated trigger: `refund_advance_policy`

Note: Both `trg_refund_advance_on_cancel` and `trg_refund_advance_policy` will insert `payment_adjustment` rows — review ordering/duplication if both triggers are active simultaneously (they are both created in the dump). If both triggers run, the system will create two payment_adjustment rows on cancel; this may be intentional (one for full advance refund + policy refund) or a duplication bug — you should verify intended behavior.


## Views

1) `public.vw_billing_summary` — per-booking summary combining room/service totals, taxes, total paid, and balance due. Used for reporting billing per booking.

2) `public.vw_service_usage_detail` — flattened detail of service usages joined to booking, room, branch and service_catalog, with line totals.

3) `public.vw_branch_revenue_monthly` — monthly aggregated revenue per branch (room nights + services). Uses generate_series to expand nights.

4) `public.vw_occupancy_by_day` — expansion of booking nights per day joined to guest and room info for occupancy reporting.

5) `public.vw_service_monthly_trend` — monthly aggregation of service usage quantities and revenue.


## Important table constraints and generated columns
- `public.booking.room_estimate` — GENERATED ALWAYS AS (nights × booked_rate) STORED
- `public.booking` has CHECK constraint `booking_advance_min_10pct` ensuring advance_payment >= round(room_estimate * 0.10, 2) (with tiny 0.005 tolerance in source)
- `public.payment_adjustment` has CHECK constraint `payment_adjustment_amount_check` ensuring amount > 0


## Notes & potential issues to review

- Trigger duplication: both `refund_advance_on_cancel` and `refund_advance_policy` are created for AFTER UPDATE OF status on `booking`. They both insert `payment_adjustment` rows for refunds; depending on the intention, this may create duplicate adjustments. Confirm intended ordering or remove one if redundant.

- ENUM casing: `booking_status` values use mixed case (`'Booked'`, `'Checked-In'`); consumers (application code) must match exactly.

- The `btree_gist` extension is installed in public — confirm that your hosting environment allows installing extensions; if not, remove or adapt indexes that depend on it.

- `sp_cancel_booking` uses `FOR UPDATE` on booking and will raise exceptions if booking not found — applications should handle this.


## Where to find the source
- The full object definitions are in `skynest_schema.sql` at repository root.


## Suggested follow-ups
- Add object-level comments (COMMENT ON FUNCTION/VIEW) for maintainability.
- Consolidate refund logic into a single trigger function if duplication isn't desired.
- Provide a short README in `docs/` explaining how to load the schema into a PostgreSQL instance (pg_restore/psql) and prereqs (extensions).


---

Generated on 2025-10-22 by repository scan of `skynest_schema.sql`.
