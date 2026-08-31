export const TRACE_SCHEMA = [
	`CREATE TABLE IF NOT EXISTS runs (
		run_id TEXT PRIMARY KEY,
		started_at_millis INTEGER NOT NULL,
		app_version TEXT NOT NULL
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS spans (
		run_id TEXT NOT NULL REFERENCES runs (run_id) ON DELETE CASCADE,
		trace_id TEXT NOT NULL,
		span_id TEXT NOT NULL,
		parent_span_id TEXT,
		name TEXT NOT NULL,
		started_at_millis INTEGER NOT NULL,
		ended_at_millis INTEGER NOT NULL,
		duration_nanos INTEGER NOT NULL,
		status TEXT NOT NULL,
		error TEXT,
		attributes TEXT NOT NULL,
		session_id TEXT,
		agent_id TEXT,
		intent_id TEXT,
		piece_id TEXT,
		PRIMARY KEY (run_id, span_id)
	) STRICT`,
	`CREATE TABLE IF NOT EXISTS logs (
		run_id TEXT NOT NULL REFERENCES runs (run_id) ON DELETE CASCADE,
		at_millis INTEGER NOT NULL,
		level TEXT NOT NULL,
		message TEXT NOT NULL,
		annotations TEXT NOT NULL,
		fiber_id INTEGER NOT NULL,
		trace_id TEXT,
		span_id TEXT
	) STRICT`,
	"CREATE INDEX IF NOT EXISTS spans_session ON spans (session_id, started_at_millis)",
	"CREATE INDEX IF NOT EXISTS spans_agent ON spans (agent_id, started_at_millis)",
	"CREATE INDEX IF NOT EXISTS spans_intent ON spans (intent_id, started_at_millis)",
	"CREATE INDEX IF NOT EXISTS spans_piece ON spans (piece_id, started_at_millis)",
	"CREATE INDEX IF NOT EXISTS spans_slowest ON spans (run_id, duration_nanos)",
	"CREATE INDEX IF NOT EXISTS spans_trace ON spans (run_id, trace_id)",
	"CREATE INDEX IF NOT EXISTS logs_span ON logs (run_id, span_id, at_millis)",
] as const;

export const INSERT_RUN = "INSERT OR REPLACE INTO runs (run_id, started_at_millis, app_version) VALUES (?, ?, ?)";

export const INSERT_SPAN = `INSERT OR REPLACE INTO spans (
	run_id, trace_id, span_id, parent_span_id, name,
	started_at_millis, ended_at_millis, duration_nanos, status, error,
	attributes, session_id, agent_id, intent_id, piece_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export const INSERT_LOG = `INSERT INTO logs (
	run_id, at_millis, level, message, annotations, fiber_id, trace_id, span_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

const RETAINED_RUNS = 5;

const RETAINED = `SELECT run_id FROM runs ORDER BY started_at_millis DESC, run_id DESC LIMIT ${RETAINED_RUNS}`;

export const PRUNE = [
	`DELETE FROM spans WHERE run_id NOT IN (${RETAINED})`,
	`DELETE FROM logs WHERE run_id NOT IN (${RETAINED})`,
	`DELETE FROM runs WHERE run_id NOT IN (${RETAINED})`,
] as const;
