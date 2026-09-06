import { packages } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import { row } from "#boundaries/policy/vocabulary-row.ts";

export const vocabularyCapabilityPolicy = [
	row(
		"artifacts-uses-agent-runtime-vocabulary",
		"Artifacts decode Moorage ownership and do not own Board, Change, or Session-event language.",
		packages.named("artifacts"),
		"artifacts",
		"src/service.ts",
		["agent-runtime"],
	),
	row(
		"boards-uses-board-vocabulary",
		"Boards owns Board storage invariants and names only the Board subject from the shared vocabulary leaf.",
		packages.named("boards"),
		"boards",
		"src/boards.ts",
		["board"],
	),
	row(
		"rulings-uses-ruling-vocabulary",
		"Rulings owns the Ruling record and names only the Ruling subject: the two declared axes, the subject kinds, and the authorities that may answer.",
		packages.named("rulings"),
		"rulings",
		"src/rulings.ts",
		["ruling"],
	),
	row(
		"session-event-journal-uses-session-event-vocabulary",
		"The Session event journal persists neutral Session events and does not consume unrelated vocabulary subjects.",
		packages.named("session-event-journal"),
		"session-event-journal",
		"src/session-event-journal.ts",
		["session-events"],
	),
	row(
		"session-fabric-uses-session-event-vocabulary",
		"The Session fabric pumps neutral Session events out of a live attachment and names no durable Agent, Board, or Change language.",
		packages.named("session-fabric"),
		"session-fabric",
		"src/session-attachment.ts",
		["session-events"],
	),
	row(
		"sessions-uses-session-vocabulary",
		"Sessions owns the durable Session tree: node lifecycle, the gap ledger, completeness, boot reconciliation, and the tree read model. It names Agent-runtime, Session-event, and Session-input language, not Board, Change, or Ruling subjects.",
		packages.named("sessions"),
		"sessions",
		"src/input.ts",
		["agent-runtime", "session-events", "session-input"],
	),
	row(
		"session-inputs-uses-session-input-vocabulary",
		"Session inputs take custody of what the admiral is about to say and name only the Session-input subject; runtime, Board, Change, and Session-event language belong to the seams that carry the words onward.",
		packages.named("session-inputs"),
		"session-inputs",
		"src/ingest.ts",
		["session-input"],
	),
] as const satisfies readonly BoundaryRule[];
