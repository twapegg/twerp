-- GCash and BPI VYBE are e-wallets, not bank accounts. Widen the account kind
-- check to include 'ewallet' and reclassify the two existing wallets.

alter table accounts drop constraint accounts_kind_check;
alter table accounts add constraint accounts_kind_check
  check (kind in ('checking', 'savings', 'credit', 'cash', 'ewallet'));

update accounts set kind = 'ewallet' where name in ('GCash', 'BPI');
