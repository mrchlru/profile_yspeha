CREATE TABLE IF NOT EXISTS interview_commission_member (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  interview_folder_key TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS interview_commission_member_folder_email_key
  ON interview_commission_member (interview_folder_key, email);

CREATE INDEX IF NOT EXISTS interview_commission_member_folder_idx
  ON interview_commission_member (interview_folder_key);
