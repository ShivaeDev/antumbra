import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

it.live("the alive gauge rejects unknown durable Agent truth", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const writer = yield* Writer;
			for (const [id, status] of [
				["agent-spawning", "spawning"],
				["agent-alive", "alive"],
				["agent-dormant", "dormant"],
				["agent-retired", "retired"],
			] as const) {
				yield* writer.write(
					db.Agent.create({ charter: id, id, role: "keeper", status }),
				);
			}
			const gauge = domain.gauges[AGENTS_ALIVE_GAUGE] ?? Effect.succeed(-1);
			expect(yield* gauge).toBe(1);
			yield* writer.write(
				db.Agent.where({ id: "agent-dormant" }).update({
					status: "future-agent",
				}),
			);
			const failure = yield* Effect.flip(gauge);
			expect(failure).toMatchObject({
				_tag: "StoredAgentStatusInvalid",
				agentId: "agent-dormant",
				value: "future-agent",
			});
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
