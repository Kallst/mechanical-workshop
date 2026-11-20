CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9-]{3,40}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_users (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  username text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Administrator','Workshop manager','Warehouse clerk','Technician')),
  password_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  UNIQUE (workspace_id, username),
  UNIQUE (workspace_id, id)
);
CREATE TABLE app_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_sessions_expiry ON app_sessions(expires_at);
CREATE TABLE scenarios (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name text NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  CHECK (jsonb_typeof(state -> 'items') = 'array'),
  CHECK (NOT jsonb_path_exists(state, '$.items[*] ? (@.stock < 0)')),
  CHECK ((state ->> 'version')::integer = 1)
);
CREATE INDEX scenarios_workspace ON scenarios(workspace_id);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  scenario_id uuid NOT NULL,
  actor_id uuid,
  actor_name text NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL,
  scenario_minute integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,scenario_id) REFERENCES scenarios(workspace_id,id),
  FOREIGN KEY (workspace_id,actor_id) REFERENCES app_users(workspace_id,id)
);
CREATE INDEX audit_scenario_time ON audit_events(scenario_id,recorded_at DESC);
CREATE FUNCTION protect_audit_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit history is append-only';
END;
$$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_audit_history();
CREATE TABLE command_receipts (
  scenario_id uuid NOT NULL REFERENCES scenarios(id),
  command_key uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES app_users(id),
  payload_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scenario_id,command_key)
);
CREATE TABLE login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_key text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempt_window ON login_attempts(account_key,attempted_at DESC);
