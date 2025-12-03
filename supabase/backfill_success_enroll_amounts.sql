-- Backfill missing amount/currency on success_enroll from program_plans
-- Run this in Supabase SQL editor if you need to repair historical data.

update public.success_enroll se
set amount = pp.price,
    currency = coalesce(pp.currency, se.currency, 'NGN')
from public.program_plans pp
where se.type = 'program'
  and se.status = 'pending'
  and (se.amount is null or se.amount = 0)
  and se.program_id is not null
  and pp.program_id = se.program_id
  and pp.plan_type = 'individual'
  and pp.family_size is null;
