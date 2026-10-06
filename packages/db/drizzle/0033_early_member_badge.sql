-- "Joined early" badge: every member registered before the public launch counts as early.
ALTER TABLE profiles ADD COLUMN early_member boolean NOT NULL DEFAULT false;
--> statement-breakpoint
-- Pre-launch members are all early members.
UPDATE profiles SET early_member = true;
