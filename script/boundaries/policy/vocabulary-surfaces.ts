import { files, importFrom, packages, vocabularyAccess } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import { agentBackends } from "#boundaries/policy/selectors.ts";

export const vocabularySurfacePolicy = [
	vocabularyAccess("agent-tools-uses-board-and-ruling-vocabulary")
		.because("Agent tools name Board and Ruling inputs, not unrelated runtime, Change, or Session-event vocabulary.")
		.for(packages.named("agent-tools"))
		.allowsOnly("board", "ruling")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(files.inPackage("platform/vocabulary", "src/change.ts")),
			legal: importFrom(files.inPackage("agent-tools", "src/tool.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
		}),
	vocabularyAccess("agent-backends-use-session-event-vocabulary")
		.because("Agent backends translate provider traffic into neutral Session events and do not consume unrelated domain vocabulary.")
		.for(agentBackends)
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("backend-codex", "src/backend.ts")).to(files.inPackage("platform/vocabulary", "src/change.ts")),
			legal: importFrom(files.inPackage("backend-codex", "src/backend.ts")).to(files.inPackage("platform/vocabulary", "src/session-events.ts")),
		}),
	vocabularyAccess("plugin-api-uses-port-vocabulary")
		.because("The driven ports name Change and Session-event vocabulary, not application runtime or Board subjects.")
		.for(packages.named("plugin-api"))
		.allowsOnly("change", "session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("plugin-api", "src/port.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
			legal: importFrom(files.inPackage("plugin-api", "src/port.ts")).to(files.inPackage("platform/vocabulary", "src/change.ts")),
		}),
	vocabularyAccess("renderer-uses-session-event-vocabulary")
		.because("The renderer receives other public words through contract; Session events are its only direct vocabulary subject.")
		.for(packages.named("renderer"))
		.allowsOnly("session-events")
		.demonstratedBy({
			illegal: importFrom(files.inPackage("renderer", "src/view.ts")).to(files.inPackage("platform/vocabulary", "src/change.ts")),
			legal: importFrom(files.inPackage("renderer", "src/view.ts")).to(files.inPackage("platform/vocabulary", "src/session-events.ts")),
		}),
] as const satisfies readonly BoundaryRule[];
