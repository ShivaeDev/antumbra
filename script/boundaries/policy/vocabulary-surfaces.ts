import { packages } from "#boundaries/dsl.ts";
import type { BoundaryRule } from "#boundaries/model.ts";
import { agentBackends } from "#boundaries/policy/selectors.ts";
import { row } from "#boundaries/policy/vocabulary-row.ts";

export const vocabularySurfacePolicy = [
	row(
		"agent-tools-uses-board-and-ruling-vocabulary",
		"Agent tools name Board and Ruling inputs, not unrelated runtime, Change, or Session-event vocabulary.",
		packages.named("agent-tools"),
		"agent-tools",
		"src/boards.ts",
		["board", "ruling"],
	),
	row(
		"agent-backends-use-session-event-vocabulary",
		"Agent backends translate provider traffic into neutral Session events and name the Session-input identity those events carry, not unrelated domain vocabulary.",
		agentBackends,
		"backend-codex",
		"src/backend.ts",
		["session-events", "session-input"],
	),
	row(
		"plugin-api-uses-port-vocabulary",
		"The driven ports name Change and Session-event vocabulary, not application runtime or Board subjects.",
		packages.named("plugin-api"),
		"plugin-api",
		"src/backend.ts",
		["change", "session-events"],
	),
	row(
		"renderer-uses-session-event-vocabulary",
		"The renderer receives other public words through contract; Session events are its only direct vocabulary subject.",
		packages.named("renderer"),
		"renderer",
		"src/app.tsx",
		["session-events"],
	),
] as const satisfies readonly BoundaryRule[];
