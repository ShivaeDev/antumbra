import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
} from "#test/harness.ts";
import { aliveAgent, eventually } from "#test/voyage-fixtures.ts";
import type { VoyageProcedures } from "#voyages.ts";

// why: the refusals a backend switch owes are proved with no kernel next door,
// in voyage-write-invariants. This one claim needs a crew already sailing, and
// only a live scheduler can put one there — so it stands apart rather than
// dragging every graph-write invariant back under the kernel.
const withCrewedDomain = <A, E, R>(
	body: (voyages: VoyageProcedures) => Effect.Effect<A, E, R>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* body(domain.voyages);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it.live(
	"a switched backend retargets the voyage and no session already open",
	() =>
		withCrewedDomain((voyages) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const voyage = yield* voyages.open({
					backend: "scripted",
					context: "the reef is uncharted",
					name: "Chart the reef",
					northStar: "every shoal is known",
				});
				const hailed = yield* voyages.hail(voyage.id);
				yield* eventually(aliveAgent(hailed.agentId));

				yield* voyages.setBackend(voyage.id, "codex");

				const stored = yield* db.Voyage.where({ id: voyage.id }).first();
				expect(Option.getOrThrow(stored).backend).toBe("codex");
				expect(
					(yield* db.AgentSession.all()).map((session) => session.backend),
				).toEqual(["scripted"]);
			}),
		),
);
