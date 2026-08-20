import { SightSource } from "@antumbra/contract";
import { Database, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { makeCurrentSessionResumable } from "#current-session-resumable.ts";
import { SightSourceLive } from "#sight.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	type ScriptedBackend,
} from "#test/harness.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

// why: the creator of subsession rows arrives with acquisition. Until then a
// test writes the row the way the tree will, so the readers can be held to the
// discipline before anything downstream depends on it.
const openSubsession = (
	id: string,
	agentId: string,
	parentSessionId: string,
	rootSessionId: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.AgentSession.create({
				agentId,
				backend: "scripted",
				charterDeliveredAt: null,
				completeness: "recording",
				cwd: `/tmp/moorage/${agentId}`,
				executionStatus: "active",
				id,
				kind: "task",
				label: "delegated reef survey",
				nativeRef: null,
				outcome: null,
				parentSessionId,
				rootSessionId,
				status: "open",
			}),
		);
	});

it.live("the fleet lists root Sessions and never a subsession", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					expect(
						fleet.agents
							.flatMap((agent) => agent.sessions)
							.map((row) => row.id),
					).toEqual([receipt.sessionId]);
				}),
			);

			yield* openSubsession(
				"session-child",
				receipt.agentId,
				receipt.sessionId,
				receipt.sessionId,
			);
			const fleet = yield* sight.fleet;
			expect(
				fleet.agents.flatMap((agent) => agent.sessions).map((row) => row.id),
			).toEqual([receipt.sessionId]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("a subsession is never a resume target", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					expect(fleet.agents).not.toEqual([]);
				}),
			);
			yield* openSubsession(
				"session-child",
				receipt.agentId,
				receipt.sessionId,
				receipt.sessionId,
			);

			const resumable = yield* makeCurrentSessionResumable;
			expect(Option.isSome((yield* resumable(receipt.sessionId)).session)).toBe(
				true,
			);
			expect(Option.isNone((yield* resumable("session-child")).session)).toBe(
				true,
			);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
