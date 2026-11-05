import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const spawn = (name: string) => ({ requestId: Request.make(name), role: "hand", backend: "claude" as const, model: null, effort: null });

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
	expect((yield* answered(api["agents.births"]({}), "agents.births")).map((birth) => birth.status)).toEqual(["requested", "requested"]);
	yield* held.commit();
	expect(yield* Fiber.join(second)).toMatchObject({ _tag: "NoSlot", limit: 1 });
	expect((yield* answered(api["agents.births"]({}), "agents.births")).map((birth) => birth.status)).toEqual(["admitted", "requested"]);
	expect((yield* executionHistory.read()).filter((event) => event.value._tag === "BirthAdmitted")).toHaveLength(1);
});
