import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Result } from "effect";
import { REEF_SOURCE, reefWithPiece } from "#test/change-fixtures.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, changeHostsOf, makeScriptedBackend, passiveRunner } from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";

const AGENT_ID = "agent-claimed";
const BERTH_ID = `${AGENT_ID}:berth-0`;

const seedRetiredBerth = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "preserve cleanup ownership",
		id: AGENT_ID,
		role: "keeper",
		status: "retired",
	});
	yield* db.Moorage.create({
		agentId: AGENT_ID,
		reclaimState: null,
		root: `/tmp/moorage/${AGENT_ID}`,
		runner: "local",
		status: "ready",
	});
	yield* db.Berth.create({
		agentId: AGENT_ID,
		branch: `work/${AGENT_ID}/berth-0`,
		id: BERTH_ID,
		path: `/tmp/moorage/${AGENT_ID}/berth-0`,
		reclaimState: null,
		ref: "main",
		runner: "local",
		slug: "berth-0",
		source: REEF_SOURCE,
		status: "ready",
		strandedAt: null,
	});
});

it.live("a terminal Agent cannot prepare new local work before reclamation claims it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const host = yield* makeScriptedHost();
		const captures = yield* Ref.make(0);
		const runner: Runner = {
			...passiveRunner,
			captureChange: (berth) => Ref.update(captures, (count) => count + 1).pipe(Effect.andThen(passiveRunner.captureChange(berth))),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const changes = yield* Changes;
			const { piece, repo } = yield* reefWithPiece;
			yield* seedRetiredBerth;
			const prepared = yield* Effect.result(
				changes.submit({
					agentId: AGENT_ID,
					pieceId: piece.id,
					repoName: repo.name,
					sessionId: "session-boundary",
				}),
			);
			expect(Result.isFailure(prepared)).toBe(true);
			if (Result.isFailure(prepared)) {
				expect(prepared.failure).toMatchObject({
					_tag: "ResourceOwnerUnavailable",
					agentId: AGENT_ID,
					status: "retired",
				});
			}
			expect(yield* db.Change.all()).toEqual([]);
			expect(yield* db.PieceChange.all()).toEqual([]);
			expect(yield* Ref.get(captures)).toBe(0);
			expect((yield* db.Moorage.where({ agentId: AGENT_ID }).first()).pipe(Option.getOrThrow).reclaimState).toBeNull();
			expect((yield* db.Berth.where({ id: BERTH_ID }).first()).pipe(Option.getOrThrow).reclaimState).toBeNull();
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner, changeHostsOf(host.host))));
	}),
);
