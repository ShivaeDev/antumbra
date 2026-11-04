import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const spawn = (name: string) => ({ requestId: Request.make(name), role: "hand", backend: "claude" as const, model: null, effort: null });
postgresApp.it(
	"replays births and continues with the same Agent readings and rejections",
	[],
	function* ({ journal, replayJournal, api, rebuild, executionHistory, clearPublished, published }) {
		const legacy = yield* journal();
		yield* legacy.api.agents.spawn(spawn("seed"));
		const captured = yield* replayJournal(legacy);
		expect(yield* api["agents.births"]({})).toEqual(captured.executionSnapshot.rows.birth);
		expect(yield* api["agents.roster"]({})).toEqual(captured.executionSnapshot.rows.agentReading);
		const next = spawn("next");
		yield* legacy.api.agents.spawn(next);
		yield* api["agents.spawn"](next);
		expect(yield* api["agents.byId"]({ id: identity(next.requestId).agentId })).toEqual(
			yield* answered(legacy.api.agents.byId({ id: identity(next.requestId).agentId }), "new journal Agent"),
		);
		const before = yield* executionHistory.read();
		yield* clearPublished();
		expect(yield* Effect.flip(api["agents.spawn"](next))).toMatchObject({ _tag: "AlreadyDone" });
		expect(yield* executionHistory.read()).toEqual(before);
		expect(yield* published()).toEqual([]);
		const roster = yield* api["agents.roster"]({});
		yield* rebuild();
		expect(yield* api["agents.roster"]({})).toEqual(roster);
	},
);

postgresApp.it("concurrent admission reserves only the available birth slot", [], function* ({ api, holdWrite, executionHistory, clock }) {
	yield* api["settings.setCount"]({ requestId: Request.make("limit"), key: "maxParallelSessions", count: 1 });
	yield* api["agents.spawn"](spawn("first"));
	yield* clock.advance(1);
	yield* api["agents.spawn"](spawn("second"));
	const admitting = (name: string) => ({
		requestId: Request.make(`admit:${name}`),
		id: identity(Request.make(name)).birthId,
		backend: "claude",
		model: "model",
		effort: null,
	});
	const held = yield* holdWrite(api["agents.admit"](admitting("first")));
	const second = yield* Effect.flip(api["agents.admit"](admitting("second"))).pipe(Effect.forkScoped);
	expect(yield* held.blocked()).not.toHaveLength(0);
	expect((yield* api["agents.births"]({})).map((birth) => birth.status)).toEqual(["requested", "requested"]);
	yield* held.commit();
	expect(yield* Fiber.join(second)).toMatchObject({ _tag: "NoSlot", limit: 1 });
	expect((yield* api["agents.births"]({})).map((birth) => birth.status)).toEqual(["admitted", "requested"]);
	expect((yield* executionHistory.read()).filter((event) => event.value._tag === "BirthAdmitted")).toHaveLength(1);
});
