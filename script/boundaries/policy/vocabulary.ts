import {
	files,
	importFrom,
	packages,
	vocabularyAccess,
} from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import { agentBackends } from "#boundaries/policy/selectors.ts";

export const vocabularyPolicy = [
	vocabularyAccess("agent-tools-uses-board-vocabulary")
		.because(
			"Agent tools name Board inputs, not unrelated runtime, Change, or Session-event vocabulary.",
		)
		.for(packages.named("agent-tools"))
		.allowsOnly("board")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(
				files.inPackage("vocabulary", "src/change.ts"),
			),
			legal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(
				files.inPackage("vocabulary", "src/board.ts"),
			),
		}),
	vocabularyAccess("artifacts-uses-agent-runtime-vocabulary")
		.because(
			"Artifacts decode Moorage ownership and do not own Board, Change, or Session-event language.",
		)
		.for(packages.named("artifacts"))
		.allowsOnly("agent-runtime")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("artifacts", "src/artifact.ts")).to(
				files.inPackage("vocabulary", "src/board.ts"),
			),
			legal: importFrom(files.inPackage("artifacts", "src/artifact.ts")).to(
				files.inPackage("vocabulary", "src/agent-runtime.ts"),
			),
		}),
	vocabularyAccess("agent-backends-use-session-event-vocabulary")
		.because(
			"Agent backends translate provider traffic into neutral Session events and do not consume unrelated domain vocabulary.",
		)
		.for(agentBackends)
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(
				files.inPackage("backend-codex", "src/backend.ts"),
			).to(files.inPackage("vocabulary", "src/change.ts")),
			legal: importFrom(files.inPackage("backend-codex", "src/backend.ts")).to(
				files.inPackage("vocabulary", "src/session-events.ts"),
			),
		}),
	vocabularyAccess("boards-uses-board-vocabulary")
		.because(
			"Boards owns Board storage invariants and names only the Board subject from the shared vocabulary leaf.",
		)
		.for(packages.named("boards"))
		.allowsOnly("board")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("boards", "src/board.ts")).to(
				files.inPackage("vocabulary", "src/change.ts"),
			),
			legal: importFrom(files.inPackage("boards", "src/board.ts")).to(
				files.inPackage("vocabulary", "src/board.ts"),
			),
		}),
	vocabularyAccess("plugin-api-uses-port-vocabulary")
		.because(
			"The driven ports name Change and Session-event vocabulary, not application runtime or Board subjects.",
		)
		.for(packages.named("plugin-api"))
		.allowsOnly("change", "session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("plugin-api", "src/port.ts")).to(
				files.inPackage("vocabulary", "src/board.ts"),
			),
			legal: importFrom(files.inPackage("plugin-api", "src/port.ts")).to(
				files.inPackage("vocabulary", "src/change.ts"),
			),
		}),
	vocabularyAccess("renderer-uses-session-event-vocabulary")
		.because(
			"The renderer receives other public words through contract; Session events are its only direct vocabulary subject.",
		)
		.for(packages.named("renderer"))
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("renderer", "src/view.ts")).to(
				files.inPackage("vocabulary", "src/change.ts"),
			),
			legal: importFrom(files.inPackage("renderer", "src/view.ts")).to(
				files.inPackage("vocabulary", "src/session-events.ts"),
			),
		}),
	vocabularyAccess("session-event-journal-uses-session-event-vocabulary")
		.because(
			"The Session event journal persists neutral Session events and does not consume unrelated vocabulary subjects.",
		)
		.for(packages.named("session-event-journal"))
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(
				files.inPackage("session-event-journal", "src/journal.ts"),
			).to(files.inPackage("vocabulary", "src/agent-runtime.ts")),
			legal: importFrom(
				files.inPackage("session-event-journal", "src/journal.ts"),
			).to(files.inPackage("vocabulary", "src/session-events.ts")),
		}),
	vocabularyAccess("session-fabric-uses-session-event-vocabulary")
		.because(
			"The Session fabric pumps neutral Session events out of a live attachment and names no durable Agent, Board, or Change language.",
		)
		.for(packages.named("session-fabric"))
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(
				files.inPackage("session-fabric", "src/session-attachment.ts"),
			).to(files.inPackage("vocabulary", "src/change.ts")),
			legal: importFrom(
				files.inPackage("session-fabric", "src/session-attachment.ts"),
			).to(files.inPackage("vocabulary", "src/session-events.ts")),
		}),
	vocabularyAccess("session-inputs-uses-session-input-vocabulary")
		.because(
			"Session inputs take custody of what the admiral is about to say and name only the Session-input subject; runtime, Board, Change, and Session-event language belong to the seams that carry the words onward.",
		)
		.for(packages.named("session-inputs"))
		.allowsOnly("session-input")
		.demonstratedBy({
			illegal: importFrom(
				files.inPackage("session-inputs", "src/session-inputs.ts"),
			).to(files.inPackage("vocabulary", "src/session-events.ts")),
			legal: importFrom(
				files.inPackage("session-inputs", "src/session-inputs.ts"),
			).to(files.inPackage("vocabulary", "src/session-input.ts")),
		}),
] as const satisfies readonly BoundaryRule[];
