-- Adds a distinct "cancelled" state so a student can abandon a pending payment
-- draft without it being confused with a genuine payment failure.
alter type payment_status add value if not exists 'cancelled';
