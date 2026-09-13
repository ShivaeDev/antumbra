import { knownModels } from "@antumbra/app-testing/backends.ts";
import { type App, eventually } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";

export const VOYAGE = VoyageId.make("reef");
export const PIECE = PieceId.make("sounding");
export const RUNNER = { runnerId: "runner", logId: "switches", backends: [], imageInputBackends: [] };
const ELSEWHERE = Request.make("elsewhere");
const raw = { kind: "provider", payload: "{}", source: "claude" };

export const opened = (app: App) =>
	app.api.voyages.open({
		requestId: Request.make(VOYAGE),
		name: "Reef",
		northStar: "Safe passage",
		context: "Survey",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});

export const chartered = (app: App) =>
	app.api.pieces.charter({
		requestId: Request.make(PIECE),
		voyageId: VOYAGE,
		title: "Sounding",
		charter: "Survey the passage",
		expectation: "A chart",
		role: "crew",
		dependsOn: [],
	});

export const launched = Effect.fn("SwitchTest.launched")(function* (app: App) {
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.pieces.launch({ id: PIECE });
});

export const wentOnElsewhere = Effect.fn("SwitchTest.elsewhere")(function* (app: App) {
	yield* app.api.agents.spawn({ requestId: ELSEWHERE, role: "crew", backend: "claude", model: null, effort: null });
	yield* eventually(app.api.agents.births({}), (births) =>
		births.some((born) => born.id === identity(ELSEWHERE).birthId && born.status !== "requested"),
	);
});

const entries = (request: Request, sessionId: string, agentId: string, cursor: number): readonly LogEntry[] => {
	const source = { logId: RUNNER.logId, at: 100 };
	return [
		{
			...source,
			cursor,
			event: {
				type: "SessionStarted",
				sessionId,
				requestId: String(request),
				agentId,
				backend: "claude",
				cwd: "/moorage",
				nativeRef: `native-${sessionId}`,
				runnerId: RUNNER.runnerId,
				toolSetVersion: "crew-v1",
			},
		},
		{ ...source, cursor: cursor + 1, event: { type: "InputAccepted", sessionId, requestId: String(request), inputId: `charter-${sessionId}` } },
		{
			...source,
			cursor: cursor + 2,
			event: { type: "ProviderEvent", sessionId, observation: "live", event: { type: "turn.completed", status: "completed", raw } },
		},
	];
};

export const crewed = Effect.fn("SwitchTest.crewed")(function* (app: App) {
	yield* knownModels(app.api, "claude", "opus");
	const runner = yield* connectRunner(RUNNER);
	const atWork = Effect.fn("SwitchTest.atWork")(function* (request: Request, cursor: number) {
		const { agentId, sessionId } = identity(request);
		yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted");
		yield* runner.append(entries(request, sessionId, agentId, cursor));
		yield* eventually(app.api.agents.reading({ id: agentId }), (reading) => reading?.state === "idle");
		return { agentId, sessionId };
	});
	return { atWork, runner };
});
