import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { StartId } from "#ids.ts";

const birth = (id: string) => ({
	requestId: Id.Request.make(id),
	agentId: AgentId.make(id),
	sessionId: SessionId.make(`session:${id}`),
	voyageId: null,
	pieceId: null,
	backend: "claude",
	model: null,
	effort: null,
	role: "hand",
	charter: "Sound the reef",
	source: "direct" as const,
	toolSetVersion: "1",
	tools: [],
});
it.app("request commits identity and resource eligibility before provider execution", function* (app) {
	yield* app.api.starts.request(birth("one"));
	expect(yield* answered(app.api.agents.byId({ id: AgentId.make("one") }))).toMatchObject({ status: "spawning", currentSessionId: "session:one" });
	expect(yield* app.rows.resourceOwner.get("one")).toMatchObject({ status: "spawning", openSessions: 0 });
	expect(yield* app.rows.session.count({})).toBe(0);
	yield* app.api.starts.request(birth("one"));
	expect(yield* app.rows.agent.count({})).toBe(1);
});
it.app("births reserve the global running budget oldest first", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1, requestId: Id.Request.make("limit") });
	yield* app.api.starts.request(birth("one"));
	yield* app.clock.advance(1);
	yield* app.api.starts.request(birth("two"));
	expect(yield* Effect.flip(app.api.starts.admit({ id: StartId.make("two"), requestId: Id.Request.make("admit-two") }))).toMatchObject({
		_tag: "NoSlot",
		limit: 1,
	});
	expect((yield* answered(app.api.starts.admitted({}))).map((held) => held.id)).toEqual(["one"]);
});
it.app("cancelling an unadmitted birth removes its demand without retiring the identity", function* (app) {
	yield* app.api.starts.request(birth("one"));
	yield* app.api.starts.cancel({ id: StartId.make("one"), requestId: Id.Request.make("cancel") });
	expect(yield* answered(app.api.agents.byId({ id: AgentId.make("one") }))).toMatchObject({ status: "dormant", currentSessionId: null });
	expect(yield* answered(app.api.starts.pending({}))).toEqual([]);
	expect(yield* app.rows.resourceOwner.get("one")).toMatchObject({ status: "dormant" });
});
it.app("retirement preserves the identity and closes resource eligibility", function* (app) {
	yield* app.api.starts.request(birth("one"));
	yield* app.api.agents.retire({ id: AgentId.make("one"), requestId: Id.Request.make("retire") });
	expect(yield* answered(app.api.agents.byId({ id: AgentId.make("one") }))).toMatchObject({ status: "retired", currentSessionId: null });
	expect(yield* app.rows.resourceOwner.get("one")).toMatchObject({ status: "retired" });
});

it.app("only logged charter acceptance activates the Agent and work reading", function* (app) {
	const creation = birth("one");
	yield* app.api.starts.request(creation);
	yield* app.api.starts.admit({ id: StartId.make("one"), requestId: Id.Request.make("admit") });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	const source = { logId: "runner", at: 100 };
	const identity = { sessionId: creation.sessionId, requestId: "one" };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				...identity,
				type: "SessionStarted",
				agentId: creation.agentId,
				backend: "claude",
				cwd: "/moorage",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "1",
			},
		},
	]);
	expect(yield* answered(app.api.agents.reading({ id: creation.agentId }))).toMatchObject({ status: "spawning", presence: "idle" });
	yield* runner.append([{ ...source, cursor: 1, event: { ...identity, type: "InputAccepted", inputId: "charter" } }]);
	expect(yield* answered(app.api.agents.reading({ id: creation.agentId }))).toMatchObject({
		status: "alive",
		presence: "working",
		canInterrupt: true,
		canSleep: false,
	});
	expect(yield* answered(app.api.agents.workingCount({}))).toBe(1);
	expect(yield* answered(app.api.starts.bySession({ sessionId: creation.sessionId }))).toMatchObject({ status: "running" });
	expect(yield* Effect.flip(app.api.agents.retire({ id: creation.agentId, requestId: Id.Request.make("retire-working") }))).toMatchObject({
		_tag: "Working",
	});
	yield* runner.append([{ ...source, cursor: 2, event: { ...identity, type: "SessionSlept" } }]);
	expect(yield* answered(app.api.agents.reading({ id: creation.agentId }))).toMatchObject({
		status: "alive",
		presence: "asleep",
		canSend: true,
		canSleep: false,
	});
	expect(yield* answered(app.api.agents.workingCount({}))).toBe(0);
});
it.app("failed start waits and explicit retry has a new deduplicated edge request", function* (app) {
	const creation = birth("one");
	yield* app.api.starts.request(creation);
	yield* app.api.starts.admit({ id: StartId.make("one"), requestId: Id.Request.make("admit") });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	yield* runner.append([
		{
			logId: "runner",
			at: 100,
			cursor: 0,
			event: { type: "SessionFailed", requestId: "one", sessionId: creation.sessionId, reason: "Sign in required" },
		},
	]);
	expect(yield* answered(app.api.starts.bySession({ sessionId: creation.sessionId }))).toMatchObject({
		status: "waiting",
		detail: "Sign in required",
	});
	yield* app.api.starts.retry({ id: StartId.make("one"), requestId: Id.Request.make("retry") });
	yield* app.api.starts.admit({ id: StartId.make("one"), requestId: Id.Request.make("readmit") });
	expect(yield* answered(app.api.starts.bySession({ sessionId: creation.sessionId }))).toMatchObject({
		status: "admitted",
		operationRequestId: "retry",
		agentId: "one",
		sessionId: "session:one",
	});
});

it.app("smoothing reuses its Agent across fresh constrained sessions", function* (app) {
	const voyageId = VoyageId.make("reef");
	yield* app.api.voyages.open({
		requestId: Id.Request.make("reef"),
		captainBackend: null,
		captainEffort: null,
		captainModel: null,
		crewBackend: null,
		crewEffort: null,
		crewModel: null,
		context: "reef",
		kind: "voyage",
		name: "Reef",
		northStar: "Known",
	});
	const { source: _source, role: _role, pieceId: _piece, ...initial } = birth("smooth-one");
	const input = { ...initial, voyageId, constrainedPrompt: "Summarize only", cwd: null };
	yield* app.api.starts.smooth(input);
	yield* app.api.starts.admit({ id: StartId.make("smooth-one"), requestId: Id.Request.make("admit") });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	const source = { logId: "runner", at: 100 };
	const identity = { sessionId: input.sessionId, requestId: "smooth-one" };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				...identity,
				type: "SessionStarted",
				agentId: input.agentId,
				backend: "claude",
				cwd: "/smooth",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "1",
			},
		},
	]);
	yield* runner.append([{ ...source, cursor: 1, event: { ...identity, type: "InputAccepted", inputId: "charter" } }]);
	yield* runner.append([{ ...source, cursor: 2, event: { ...identity, type: "SessionEnded", reason: "complete" } }]);
	expect(yield* answered(app.api.agents.smoother({ voyageId }))).toMatchObject({ id: input.agentId, status: "alive", currentSessionId: null });
	const next = {
		...input,
		requestId: Id.Request.make("smooth-two"),
		sessionId: SessionId.make("session:two"),
		constrainedPrompt: "Summarize next",
		toolSetVersion: "2",
	};
	yield* app.api.starts.smooth(next);
	expect(yield* answered(app.api.starts.bySession({ sessionId: next.sessionId }))).toMatchObject({
		createsAgent: false,
		constrainedPrompt: "Summarize next",
		toolSetVersion: "2",
	});
	expect(yield* app.rows.agent.count({})).toBe(1);
	expect(
		yield* Effect.flip(app.api.starts.smooth({ ...next, requestId: Id.Request.make("overlap"), sessionId: SessionId.make("session:overlap") })),
	).toMatchObject({ _tag: "Busy" });
	yield* app.api.starts.cancel({ id: StartId.make("smooth-two"), requestId: Id.Request.make("cancel-pass") });
	expect(yield* answered(app.api.agents.smoother({ voyageId }))).toMatchObject({ status: "alive", currentSessionId: null });
});
