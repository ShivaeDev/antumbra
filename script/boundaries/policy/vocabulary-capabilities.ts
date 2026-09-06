import { files, importFrom, packages, vocabularyAccess } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";

export const vocabularyCapabilityPolicy = [
	vocabularyAccess("artifacts-uses-agent-runtime-vocabulary")
		.because("Artifacts decode Moorage ownership and do not own Board, Change, or Session-event language.")
		.for(packages.named("artifacts"))
		.allowsOnly("agent-runtime")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("artifacts", "src/artifact.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
			legal: importFrom(files.inPackage("artifacts", "src/artifact.ts")).to(files.inPackage("platform/vocabulary", "src/agent-runtime.ts")),
		}),
	vocabularyAccess("boards-uses-board-vocabulary")
		.because("Boards owns Board storage invariants and names only the Board subject from the shared vocabulary leaf.")
		.for(packages.named("boards"))
		.allowsOnly("board")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("boards", "src/board.ts")).to(files.inPackage("platform/vocabulary", "src/change.ts")),
			legal: importFrom(files.inPackage("boards", "src/board.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
		}),
	vocabularyAccess("rulings-uses-ruling-vocabulary")
		.because(
			"Rulings owns the Ruling record and names only the Ruling subject: the two declared axes, the subject kinds, and the authorities that may answer.",
		)
		.for(packages.named("rulings"))
		.allowsOnly("ruling")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("rulings", "src/rulings.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
			legal: importFrom(files.inPackage("rulings", "src/rulings.ts")).to(files.inPackage("platform/vocabulary", "src/ruling.ts")),
		}),
	vocabularyAccess("session-event-journal-uses-session-event-vocabulary")
		.because("The Session event journal persists neutral Session events and does not consume unrelated vocabulary subjects.")
		.for(packages.named("session-event-journal"))
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("session-event-journal", "src/journal.ts")).to(
				files.inPackage("platform/vocabulary", "src/agent-runtime.ts"),
			),
			legal: importFrom(files.inPackage("session-event-journal", "src/journal.ts")).to(
				files.inPackage("platform/vocabulary", "src/session-events.ts"),
			),
		}),
	vocabularyAccess("session-fabric-uses-session-event-vocabulary")
		.because("The Session fabric pumps neutral Session events out of a live attachment and names no durable Agent, Board, or Change language.")
		.for(packages.named("session-fabric"))
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("session-fabric", "src/session-attachment.ts")).to(files.inPackage("platform/vocabulary", "src/change.ts")),
			legal: importFrom(files.inPackage("session-fabric", "src/session-attachment.ts")).to(
				files.inPackage("platform/vocabulary", "src/session-events.ts"),
			),
		}),
	vocabularyAccess("sessions-uses-session-vocabulary")
		.because(
			"Sessions owns the durable Session tree: node lifecycle, the gap ledger, completeness, boot reconciliation, and the tree read model. It names Agent-runtime, Session-event, and Session-input language, not Board, Change, or Ruling subjects.",
		)
		.for(packages.named("sessions"))
		.allowsOnly("agent-runtime", "session-events", "session-input")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("sessions", "src/session-send.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
			legal: importFrom(files.inPackage("sessions", "src/session-send.ts")).to(files.inPackage("platform/vocabulary", "src/agent-runtime.ts")),
		}),
	vocabularyAccess("session-inputs-uses-session-input-vocabulary")
		.because(
			"Session inputs take custody of what the admiral is about to say and name only the Session-input subject; runtime, Board, Change, and Session-event language belong to the seams that carry the words onward.",
		)
		.for(packages.named("session-inputs"))
		.allowsOnly("session-input")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("session-inputs", "src/session-inputs.ts")).to(
				files.inPackage("platform/vocabulary", "src/session-events.ts"),
			),
			legal: importFrom(files.inPackage("session-inputs", "src/session-inputs.ts")).to(
				files.inPackage("platform/vocabulary", "src/session-input.ts"),
			),
		}),
] as const satisfies readonly BoundaryRule[];
