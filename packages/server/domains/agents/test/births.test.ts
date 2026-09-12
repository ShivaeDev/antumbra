import { knownModels } from "@antumbra/app-testing/backends.ts";
import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { identity } from "#ids.ts";

const READABLE = /^[0-9abcdefghjkmnpqrstvwxyz]{10}$/;
const asking = (id: string) => ({ requestId: Id.Request.make(id), role: "hand", backend: "claude" as const, model: null, effort: null });
const born = (id: string) => identity(Id.Request.make(id));
const BLOCKED = {
	backend: "claude",
	status: "blocked",
	reason: "usage-limit",
	detail: "rate limited",
	observedAt: 0,
	resetsAt: null,
	utilization: null,
} as const;

it.app("spawn commits identity and resource eligibility before provider execution", function* (app) {
	yield* app.api.agents.spawn(asking("one"));
	expect(yield* answered(app.api.agents.byId({ id: born("one").agentId }))).toMatchObject({
		status: "spawning",
		currentSessionId: born("one").sessionId,
	});
	expect(yield* app.rows.resourceOwner.get(born("one").agentId)).toMatchObject({ status: "spawning", openSessions: 0 });
	expect(yield* app.rows.session.count({})).toBe(0);
	yield* app.api.agents.spawn(asking("one"));
	expect(yield* app.rows.agent.count({})).toBe(1);
});

it.app("births reserve the global running budget oldest first", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1, requestId: Id.Request.make("limit") });
	yield* app.api.agents.spawn(asking("one"));
	yield* app.clock.advance(1);
	yield* app.api.agents.spawn(asking("two"));
	expect((yield* eventually(app.api.agents.admitted({}), (births) => births.length === 1)).map((held) => held.id)).toEqual([born("one").birthId]);
	expect(
		yield* Effect.flip(
			app.api.agents.admit({ id: born("two").birthId, backend: "claude", model: "opus", effort: null, requestId: Id.Request.make("admit-two") }),
		),
	).toMatchObject({ _tag: "NoSlot", limit: 1 });
});

it.app("the admitting reconciler resolves the role settings a request did not override", function* (app) {
	yield* app.api.roleSettings.choose({ scope: "fleet", role: "crew", backend: "claude", model: "resolved-model", effort: "low" });
	yield* app.api.agents.spawn({ requestId: Id.Request.make("resolved"), role: "crew", backend: null, model: null, effort: null });
	expect(
		yield* eventually(app.api.agents.birthBySession({ sessionId: born("resolved").sessionId }), (held) => held?.status === "admitted"),
	).toMatchObject({ backend: "claude", model: "resolved-model", effort: "low" });
});

it.app("a birth held on a blocked backend is admitted once the role setting moves it", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* knownModels(app.api, "codex", "gpt");
	yield* app.api.capacity.observe({ ...BLOCKED, requestId: Id.Request.make("blocked") });
	yield* app.api.agents.spawn({ requestId: Id.Request.make("waiting"), role: "crew", backend: null, model: null, effort: null });
	const sessionId = born("waiting").sessionId;
	expect(yield* answered(app.api.agents.birthBySession({ sessionId }))).toMatchObject({ status: "requested" });
	yield* app.api.roleSettings.choose({ scope: "fleet", role: "crew", backend: "codex", model: null, effort: null });
	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted")).toMatchObject({ backend: "codex" });
});

it.app("an unset model is admitted on the model its backend declares", function* (app) {
	yield* knownModels(app.api, "claude", "opus", "high");
	yield* app.api.agents.spawn(asking("one"));

	expect(yield* eventually(app.api.agents.birthBySession({ sessionId: born("one").sessionId }), (held) => held?.status === "admitted")).toMatchObject(
		{
			backend: "claude",
			effort: "high",
			model: "opus",
		},
	);
});

it.app("a birth waits for its backend to list its models and says so until one arrives", function* (app) {
	yield* connectRunner({ runnerId: "runner", logId: "runner", backends: ["claude"], imageInputBackends: [] }, { models: "none" });
	yield* app.api.agents.spawn(asking("one"));
	const sessionId = born("one").sessionId;

	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.detail !== null)).toMatchObject({
		detail: "waiting for claude to list its models",
		status: "requested",
	});

	yield* app.api.backends.listModels({ backend: "claude", failure: "claude is not on the path", models: [] });
	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.detail?.includes(":") === true)).toMatchObject({
		detail: "waiting for claude to list its models: claude is not on the path",
		status: "requested",
	});

	yield* knownModels(app.api, "claude", "opus");
	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted")).toMatchObject({
		detail: null,
		model: "opus",
	});
});

it.app("cancelling an unadmitted birth removes its demand without retiring the identity", function* (app) {
	yield* app.api.capacity.observe({ ...BLOCKED, requestId: Id.Request.make("closed") });
	yield* app.api.agents.spawn(asking("one"));
	yield* app.api.agents.cancel({ id: born("one").birthId, requestId: Id.Request.make("cancel") });
	expect(yield* answered(app.api.agents.byId({ id: born("one").agentId }))).toMatchObject({ status: "dormant", currentSessionId: null });
	expect(yield* answered(app.api.agents.pending({}))).toEqual([]);
	expect(yield* app.rows.resourceOwner.get(born("one").agentId)).toMatchObject({ status: "dormant" });
});

it.app("retirement preserves the identity and closes resource eligibility", function* (app) {
	yield* app.api.agents.spawn(asking("one"));
	yield* app.api.agents.retire({ id: born("one").agentId, requestId: Id.Request.make("retire") });
	expect(yield* answered(app.api.agents.byId({ id: born("one").agentId }))).toMatchObject({ status: "retired", currentSessionId: null });
	expect(yield* app.rows.resourceOwner.get(born("one").agentId)).toMatchObject({ status: "retired" });
});

it.app("only logged charter acceptance activates the Agent and work reading", function* (app) {
	const { agentId, sessionId } = born("one");
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.agents.spawn(asking("one"));
	yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted");
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	const source = { logId: "runner", at: 100 };
	const logged = { sessionId, requestId: "one" };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				...logged,
				type: "SessionStarted",
				agentId,
				backend: "claude",
				cwd: "/moorage",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "crew-v1",
			},
		},
	]);
	expect(yield* answered(app.api.agents.reading({ id: agentId }))).toMatchObject({ status: "spawning", presence: "idle" });
	yield* runner.append([{ ...source, cursor: 1, event: { ...logged, type: "InputAccepted", inputId: "charter" } }]);
	expect(yield* answered(app.api.agents.reading({ id: agentId }))).toMatchObject({
		status: "alive",
		presence: "working",
		canInterrupt: true,
		canSleep: false,
	});
	expect(yield* answered(app.api.agents.workingCount({}))).toBe(1);
	expect(yield* answered(app.api.agents.birthBySession({ sessionId }))).toMatchObject({ status: "running" });
	expect(yield* Effect.flip(app.api.agents.retire({ id: agentId, requestId: Id.Request.make("retire-working") }))).toMatchObject({ _tag: "Working" });
	yield* runner.append([{ ...source, cursor: 2, event: { ...logged, type: "SessionSlept" } }]);
	expect(yield* answered(app.api.agents.reading({ id: agentId }))).toMatchObject({
		status: "alive",
		presence: "asleep",
		canSend: true,
		canSleep: false,
	});
	expect(yield* answered(app.api.agents.workingCount({}))).toBe(0);
});

it.app("failed start waits and explicit retry has a new deduplicated edge request", function* (app) {
	const { sessionId } = born("one");
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.agents.spawn(asking("one"));
	yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted");
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	yield* runner.append([
		{ logId: "runner", at: 100, cursor: 0, event: { type: "SessionFailed", requestId: "one", sessionId, reason: "Sign in required" } },
	]);
	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "waiting")).toMatchObject({
		detail: "Sign in required",
	});
	yield* app.api.agents.retry({ id: born("one").birthId, requestId: Id.Request.make("retry") });
	expect(yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted")).toMatchObject({
		operationRequestId: "retry",
		agentId: born("one").agentId,
		sessionId,
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
	const agentId = born("smooth-one").agentId;
	const input = { requestId: Id.Request.make("smooth-one"), agentId, sessionId: SessionId.make("session:one"), voyageId, cwd: null };
	yield* app.api.agents.smooth(input);
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	const source = { logId: "runner", at: 100 };
	const logged = { sessionId: input.sessionId, requestId: "smooth-one" };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				...logged,
				type: "SessionStarted",
				agentId,
				backend: "claude",
				cwd: "/smooth",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "smoothing-v1",
			},
		},
	]);
	yield* runner.append([{ ...source, cursor: 1, event: { ...logged, type: "InputAccepted", inputId: "charter" } }]);
	yield* runner.append([{ ...source, cursor: 2, event: { ...logged, type: "SessionEnded", reason: "complete" } }]);
	expect(yield* answered(app.api.agents.smoother({ voyageId }))).toMatchObject({ id: agentId, status: "alive", currentSessionId: null });
	const next = { ...input, requestId: Id.Request.make("smooth-two"), sessionId: SessionId.make("session:two") };
	yield* app.api.agents.smooth(next);
	expect(yield* answered(app.api.agents.birthBySession({ sessionId: next.sessionId }))).toMatchObject({ createsAgent: false, role: "smoother" });
	expect(yield* app.rows.agent.count({})).toBe(1);
	expect(
		yield* Effect.flip(app.api.agents.smooth({ ...next, requestId: Id.Request.make("overlap"), sessionId: SessionId.make("session:overlap") })),
	).toMatchObject({ _tag: "Busy" });
	yield* app.api.agents.cancel({ id: born("smooth-two").birthId, requestId: Id.Request.make("cancel-pass") });
	expect(yield* answered(app.api.agents.smoother({ voyageId }))).toMatchObject({ status: "alive", currentSessionId: null });
});

it.app("a tool call's request id never becomes the name of the agent it asks for", function* (app) {
	const asked = requestId({ sessionId: "session-1", callId: "call-9" });
	const ids = identity(asked);
	expect(ids.agentId).toMatch(READABLE);
	expect(ids.sessionId).toMatch(READABLE);
	expect(ids.birthId).toMatch(READABLE);
	expect(new Set([ids.agentId, ids.sessionId, ids.birthId]).size).toBe(3);
	yield* app.api.agents.spawn({ requestId: asked, role: "hand", backend: "claude", model: null, effort: null });
	expect(yield* answered(app.api.agents.byId({ id: ids.agentId }))).toMatchObject({ status: "spawning", currentSessionId: ids.sessionId });
});
