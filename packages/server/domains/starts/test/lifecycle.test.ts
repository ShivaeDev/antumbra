import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { StartId } from "#ids.ts";
import { admission } from "#reconcilers/admission.ts";

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
	expect(yield* Effect.flip(app.api.starts.admit({ id: StartId.make("two"), requestId: Id.Request.make("admit-two-early") }))).toMatchObject({
		_tag: "NotOldest",
	});
	yield* app.api.starts.admit({ id: StartId.make("one"), requestId: Id.Request.make("admit-one") });
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

it.app("admission wakes when the configured running budget increases", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1, requestId: Id.Request.make("limit") });
	yield* app.api.starts.request(birth("one"));
	yield* app.clock.advance(1);
	yield* app.api.starts.request(birth("two"));
	yield* admission;
	yield* eventually(app.api.starts.admitted({}), (rows) => rows.length === 1);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 2, requestId: Id.Request.make("increase") });
	const admitted = yield* eventually(app.api.starts.admitted({}), (rows) => rows.length === 2);
	expect(admitted.map((held) => held.id)).toEqual(["one", "two"]);
});
