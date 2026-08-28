import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";

const seedInvalidSweep = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.transaction(
		Effect.gen(function* () {
			yield* Database;
			yield* db.Agent.create({
				charter: "preserve uncertain resources",
				id: "agent-invalid-sweep",
				role: "keeper",
				status: "future-agent",
			});
			yield* db.Berth.create({
				agentId: "agent-invalid-sweep",
				branch: "work/keeper/uncertain",
				id: "agent-invalid-sweep:uncertain",
				path: "/tmp/moorage/agent-invalid-sweep/uncertain",
				reclaimState: null,
				ref: "main",
				runner: "local",
				slug: "uncertain",
				source: "/somewhere/uncertain",
				status: "ready",
				strandedAt: null,
			});
		}),
	);
});

it.live("invalid Agent truth skips the complete reclaim sweep unchanged", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const reclaims = yield* Ref.make(0);
		const runner: Runner = {
			...recorder.runner,
			reclaim: () =>
				Ref.update(reclaims, (count) => count + 1).pipe(
					Effect.as({ _tag: "reclaimed" as const }),
				),
		};
		yield* seedInvalidSweep.pipe(Effect.provide(temporary.layer));

		yield* Effect.provide(
			Effect.void,
			domainKernelLayer(temporary, scripted.backend, {}, runner),
		);
		expect(yield* Ref.get(reclaims)).toBe(0);
		const status = yield* Effect.gen(function* () {
			const db = yield* Database;
			return Option.getOrThrow(
				yield* db.Berth.where({
					id: "agent-invalid-sweep:uncertain",
				}).first(),
			).status;
		}).pipe(Effect.provide(temporary.layer));
		expect(status).toBe("ready");
	}),
);
