ALTER TABLE member_notifications DROP CONSTRAINT member_notifications_category_check;
--> statement-breakpoint
ALTER TABLE member_notifications
  ADD CONSTRAINT member_notifications_category_check
  CHECK (category IN ('DAILY_GAME','JOB_APPLICATION'));
--> statement-breakpoint
CREATE INDEX member_notifications_application_inbox_idx
  ON member_notifications(user_id,created_at DESC)
  WHERE category='JOB_APPLICATION';
