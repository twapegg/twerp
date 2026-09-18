-- Where a goal's monthly set-aside comes from. When true, the money is part of
-- the Savings budget (so it must not be counted again in the paycheck
-- allocation); when false, it is an extra amount taken from the paycheck on
-- top of savings.
alter table goals add column funded_from_savings boolean not null default false;
