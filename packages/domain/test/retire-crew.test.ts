import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer, sightSourceTestLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend, standDown } from "#test/harness.ts";
import { born, chartered, handFor, landed } from "#test/retire-crew-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

const SOUNDER = "agent-sounder";
const MATE = "agent-mate";
const ELSEWHERE = "agent-elsewhere";

const sightLayer = (temporary: TemporaryPersistence, scripted: ScriptedBackend) =>
	sightSourceTestLayer.pipe(Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)));

const awaitRetirement = Effect.fnUntraced(function* () {
	const db = yield* Database;
	const kernel = yield* Kernel;
	const intents = yield* db.Intent.where({ tag: "agent/retire" }).all();
	for (const intent of intents) {
		expect(yield* untilTerminal(kernel.changes(intent.id))).toBe("succeeded");
	}
});

const retiredAgents = Effect.gen(function* () {
	const db = yield* Database;
	const agents = yield* db.Agent.where({ status: "retired" }).all();
	return agents.map((agent) => agent.id).toSorted();
});

it.live("retiring a piece's crew retires exactly the agents claimed to it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const { pieceId, voyageId } = yield* chartered;
			const other = yield* chartered;
			yield* born(handFor(SOUNDER, pieceId, voyageId));
			yield* born(handFor(MATE, pieceId, voyageId));
			yield* born(handFor(ELSEWHERE, other.pieceId, other.voyageId));
			yield* landed(pieceId);
			yield* standDown(scripted, SOUNDER);
			yield* standDown(scripted, MATE);
			yield* standDown(scripted, ELSEWHERE);

			yield* sight.retireCrew(pieceId);

			yield* awaitRetirement();
			expect(yield* retiredAgents).toEqual([MATE, SOUNDER].toSorted());
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("retiring a piece's crew never retires the voyage captain", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			const { pieceId, voyageId } = yield* chartered;
			const captain = yield* domain.voyages.hail(voyageId);
			expect(yield* untilTerminal(kernel.changes(captain.intentId))).toBe("succeeded");
			yield* born(handFor(SOUNDER, pieceId, voyageId));
			yield* landed(pieceId);
			yield* standDown(scripted, captain.agentId);
			yield* standDown(scripted, SOUNDER);

			yield* sight.retireCrew(pieceId);

			yield* awaitRetirement();
			expect(yield* retiredAgents).toEqual([SOUNDER]);
			const still = yield* db.Agent.where({ id: captain.agentId }).first();
			expect(Option.getOrThrow(still).status).toBe("alive");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
