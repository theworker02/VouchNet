CREATE TABLE daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date date NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  category text NOT NULL CHECK (category IN ('DEBUGGING','SYSTEMS','ALGORITHMS')),
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 20 AND 4000),
  starter_code text,
  solution text NOT NULL CHECK (char_length(solution) BETWEEN 20 AND 4000),
  duration_minutes smallint NOT NULL DEFAULT 3 CHECK (duration_minutes BETWEEN 1 AND 10),
  publication_actor_type text NOT NULL DEFAULT 'SYSTEM' CHECK (publication_actor_type = 'SYSTEM'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
--> statement-breakpoint
CREATE INDEX daily_challenges_public_date_idx ON daily_challenges(challenge_date DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
INSERT INTO daily_challenges (challenge_date,title,category,prompt,starter_code,solution,duration_minutes)
VALUES (
  CURRENT_DATE,
  'The accidental quadratic lookup',
  'ALGORITHMS',
  'A CLI receives 40,000 package names and a set of installed package names. It needs to print each missing name. The implementation below slows dramatically as the input grows. Identify the complexity problem and the smallest change that makes membership lookup scale linearly overall.',
  'const installed = ["core", "lint", "format"];\nconst requested = ["core", "docs", "format", "types"];\n\nfor (const name of requested) {\n  if (!installed.includes(name)) console.log(name);\n}',
  'Array.prototype.includes performs a linear scan. Repeating it once per requested package can become O(requested × installed). Build a Set once, then use set.has(name): `const installedSet = new Set(installed)`. Construction is O(installed) and each lookup is expected O(1), so the complete pass is O(installed + requested).',
  3
)
ON CONFLICT (challenge_date) DO NOTHING;
