import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { makeBackendCapacityController } from "@antumbra/plugin-api";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Clock, Effect, Option } from "effect";
import { makeScriptedBackend, rawOf } from "#test/harness.ts";
import { untilTerminal, untilWaitingOrTerminal } from "#test/session-recovery-fixture.ts";
import { spawnRequest } from "#test/sight-fixture.ts";

it.effectApp.withProviders(
	"retrying a paused provider resumes every parked birth",
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const capacity = yield* makeBackendCapacityController((raw) =>
			raw.kind === "quota/rejected"
				? Option.some({
						detail: "scripted quota exhausted",
						reason: "usage-limit" as const,
						status: "blocked" as const,
					})
				: Option.none(),
		);
		capacity.observe(rawOf("quota/rejected"), yield* Clock.currentTimeMillis);
		const backend = { ...scripted.backend, capacity: capacity.source };
		return { providers: { backends: new Map([[backend.tag, backend]]) }, state: scripted };
	}),
	function* (_, scripted) {
		const db = yield* Database;
		const sight = yield* SightSource;
		yield* sight.spawn(spawnRequest);
		yield* sight.spawn({ ...spawnRequest, role: "surveyor" });
		const kernel = yield* Kernel;
		const births = yield* db.Intent.where({ tag: "agent/spawn" }).all();
		expect(births).toHaveLength(2);
		for (const birth of births) {
			expect(yield* untilWaitingOrTerminal(kernel.changes(birth.id))).toBe("waiting");
		}
		yield* db.Intent.create({
			detail: "runner authentication required",
			id: "unrelated-wait",
			payload: JSON.stringify({
				agentId: "agent-unrelated",
				backend: "scripted",
				charter: "wait for credentials",
				role: "navigator",
				runner: "local",
				sessionId: "session-unrelated",
			}),
			status: "waiting",
			tag: "agent/spawn",
		});

		yield* sight.retryBackend("scripted");
		for (const birth of births) {
			expect(yield* untilTerminal(kernel.changes(birth.id))).toBe("succeeded");
		}
		expect(yield* scripted.opened).toHaveLength(2);
		expect((yield* sight.fleet).capacities).toEqual([expect.objectContaining({ backend: "scripted", status: "available" })]);
		expect(Option.getOrThrow(yield* db.Intent.where({ id: "unrelated-wait" }).first()).status).toBe("waiting");
	},
);
