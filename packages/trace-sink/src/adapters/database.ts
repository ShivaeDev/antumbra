import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { INSERT_LOG, INSERT_RUN, INSERT_SPAN, PRUNE, TRACE_SCHEMA } from "#adapters/schema.ts";
import type { LogRow } from "#log-row.ts";
import type { SpanRow } from "#span-row.ts";

export interface TraceRun {
	readonly appVersion: string;
	readonly path: string;
	readonly runId: string;
	readonly startedAtMillis: number;
}

export interface TraceDatabase {
	readonly close: () => void;
	readonly write: (spans: readonly SpanRow[], logs: readonly LogRow[]) => void;
}

// why: WAL keeps the writer from blocking whoever is reading the trace while the
// app runs, and NORMAL means a flush does not wait on a disk sync. Losing the
// last few spans to a hard crash is the right trade for a dev-only record.
const PRAGMAS = ["PRAGMA journal_mode = WAL", "PRAGMA synchronous = NORMAL", "PRAGMA busy_timeout = 2000"] as const;

const spanValues = (runId: string, span: SpanRow): readonly SQLInputValue[] => [
	runId,
	span.traceId,
	span.spanId,
	span.parentSpanId,
	span.name,
	span.startedAtMillis,
	span.endedAtMillis,
	span.durationNanos,
	span.status,
	span.error,
	span.attributes,
	span.sessionId,
	span.agentId,
	span.intentId,
	span.pieceId,
];

const logValues = (runId: string, log: LogRow): readonly SQLInputValue[] => [
	runId,
	log.atMillis,
	log.level,
	log.message,
	log.annotations,
	log.fiberId,
	log.traceId,
	log.spanId,
];

const openFile = (run: TraceRun): DatabaseSync => {
	const database = new DatabaseSync(run.path);
	for (const pragma of PRAGMAS) {
		database.exec(pragma);
	}
	for (const statement of TRACE_SCHEMA) {
		database.exec(statement);
	}
	database.prepare(INSERT_RUN).run(run.runId, run.startedAtMillis, run.appVersion);
	for (const statement of PRUNE) {
		database.exec(statement);
	}
	return database;
};

export const openTraceDatabase = (run: TraceRun): TraceDatabase => {
	const database = openFile(run);
	const insertSpan = database.prepare(INSERT_SPAN);
	const insertLog = database.prepare(INSERT_LOG);
	const append = (spans: readonly SpanRow[], logs: readonly LogRow[]): void => {
		for (const span of spans) {
			insertSpan.run(...spanValues(run.runId, span));
		}
		for (const log of logs) {
			insertLog.run(...logValues(run.runId, log));
		}
	};
	return {
		close: () => {
			database.close();
		},
		write: (spans, logs) => {
			database.exec("BEGIN IMMEDIATE");
			try {
				append(spans, logs);
				database.exec("COMMIT");
			} catch (cause) {
				database.exec("ROLLBACK");
				throw cause;
			}
		},
	};
};
