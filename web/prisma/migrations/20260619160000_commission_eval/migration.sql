CREATE TABLE IF NOT EXISTS commission_member_question_set (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  member_id TEXT NOT NULL UNIQUE,
  interview_folder_key TEXT NOT NULL,
  question1_text TEXT NOT NULL,
  question2_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS commission_member_question_set_folder_idx
  ON commission_member_question_set (interview_folder_key);

CREATE TABLE IF NOT EXISTS commission_eval_sheet (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  access_token TEXT NOT NULL UNIQUE,
  interview_folder_key TEXT NOT NULL,
  candidate_folder_key TEXT NOT NULL,
  member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scale_answers JSONB,
  variable_answers JSONB,
  submitted_at TIMESTAMP(3),
  email_sent_at TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS commission_eval_sheet_member_candidate_key
  ON commission_eval_sheet (member_id, candidate_folder_key);

CREATE INDEX IF NOT EXISTS commission_eval_sheet_candidate_folder_idx
  ON commission_eval_sheet (candidate_folder_key, interview_folder_key);

CREATE TABLE IF NOT EXISTS commission_candidate_conclusion (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  interview_folder_key TEXT NOT NULL,
  candidate_folder_key TEXT NOT NULL UNIQUE,
  report_html TEXT NOT NULL,
  report_data JSONB NOT NULL,
  ai_conclusion TEXT
);

CREATE INDEX IF NOT EXISTS commission_candidate_conclusion_folder_idx
  ON commission_candidate_conclusion (interview_folder_key);
