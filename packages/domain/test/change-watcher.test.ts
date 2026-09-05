import { Changes } from "@antumbra/changes";
import type { ObserveCadenceOptions } from "@antumbra/changes/watch/cadence";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Queue } from "effect";
import { TestClock } from "effect/testing";
import { AgentDomain } from "#domain.ts";
import { berthed, REEF_SOURCE, reefWithPiece } from "#test/change-fixtures.ts";
import { watchingLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	changeHostsOf,
	makeScriptedBackend,
	makeScriptedRunner,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import { makeScriptedHost, type ScriptedHost } from "#test/scripted-host.ts";
import { assignedPieces, eventually, openReefVoyage, standDownAll, stateOf } from "#test/voyage-fixtures.ts";

const CREW = "agent-crew";

const cadence = (hotMillis: number, warmMillis: number, coldMillis: number): ObserveCadenceOptions => ({
	coldMillis,
	hotMillis,
	hotWindowMillis: 0,
	warmMillis,
});

const SLOW = cadence(60_000, 60_000, 60_000);
const BRISK = cadence(50, 50, 60_000);

const FALTERING = cadence(20, 20, 80);

interface WatchingHost extends ScriptedHost {
	readonly observations: Queue.Queue<number>;
}

const watched = <A, E, R>(cadence: ObserveCadenceOptions, body: (scripted: WatchingHost, backend: ScriptedBackend) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const scripted = yield* makeScriptedHost();
		const observations = yield* Queue.unbounded<number>();
		const host: WatchingHost = {
			...scripted,
			host: {
				...scripted.host,
				observe: (asked) =>
					scripted.host.observe(asked).pipe(Effect.tap(() => Effect.flatMap(scripted.drive.asked, (all) => Queue.offer(observations, all.length)))),
			},
			observations,
		};
		yield* body(host, backend).pipe(
			Effect.provide(
				watchingLayer(temporary, backend.backend, cadence, changeHostsOf(host.host), { maxRunning: 4, patienceMillis: 50 }, recorder.runner),
			),
		);
	});

const openedChange = (pieceId: string, repoName: string) =>
	Effect.gen(function* () {
		const changes = yield* Changes;
		return yield* changes.open({
			agentId: CREW,
			base: null,
			body: "sounded three fathoms",
			draft: false,
			pieceId,
			repoName,
			sessionId: "session-crew",
			title: "chart the eastern spit",
		});
	});

const passes = (scripted: ScriptedHost) => Effect.map(scripted.drive.asked, (asked) => asked.length);

const settled = (scripted: ScriptedHost) =>
	Effect.gen(function* () {
		const before = yield* passes(scripted);
		yield* TestClock.adjust(200);
		const after = yield* passes(scripted);
		return before === after ? after : yield* Effect.fail("still observing");
	});

const askedMoreThan = (scripted: WatchingHost, count: number): Effect.Effect<void> =>
	Queue.take(scripted.observations).pipe(Effect.flatMap((observed) => (observed > count ? Effect.void : askedMoreThan(scripted, count))));

const hearsTheLanding = (scripted: ScriptedHost, repoId: string, delayMillis: number) =>
	Effect.gen(function* () {
		const changes = yield* Changes;
		yield* scripted.drive.refuse(null);
		yield* scripted.drive.transition(repoId, "1", { stage: "landed" });
		yield* TestClock.adjust(delayMillis);
		yield* TestClock.withLive(
			eventually(
				Effect.gen(function* () {
					expect((yield* changes.watchable("scripted")).length).toBe(0);
				}),
			),
		);
	});

describe("watching open changes", () => {
	it.effect("asks again promptly when somebody rings", () =>
		watched(SLOW, (scripted) =>
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const beforeOpen = yield* passes(scripted);
				yield* openedChange(piece.id, repo.name);
				yield* askedMoreThan(scripted, beforeOpen);
				const quiet = yield* settled(scripted);

				yield* domain.changes.requestRefresh;

				yield* askedMoreThan(scripted, quiet);
			}),
		),
	);

	it.effect("keeps asking while a change is open and stops when it lands", () =>
		watched(BRISK, (scripted, backend) =>
			Effect.gen(function* () {
				const { piece, repo, voyage } = yield* reefWithPiece;
				yield* berthed(CREW);
				yield* openedChange(piece.id, repo.name);
				yield* scripted.drive.transition(repo.id, "1", { checks: "green" });

				const early = yield* passes(scripted);
				yield* TestClock.adjust(300);
				expect(yield* passes(scripted)).toBeGreaterThan(early);

				yield* scripted.drive.transition(repo.id, "1", { stage: "landed" });
				yield* TestClock.adjust(BRISK.warmMillis);
				// A launched piece may already have a crew member before its change
				// row exists; settle any such crew before reading its state.
				yield* TestClock.withLive(
					eventually(
						Effect.gen(function* () {
							yield* Effect.ignore(standDownAll(backend));
							expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
						}),
					),
				);
				yield* settled(scripted);
			}),
		),
	);

	it.effect("leaves rows untouched when a host will not answer", () =>
		watched(BRISK, (scripted) =>
			Effect.gen(function* () {
				const changes = yield* Changes;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const row = yield* openedChange(piece.id, repo.name);
				yield* scripted.drive.refuse("the harbour master is asleep");

				const before = yield* passes(scripted);
				yield* TestClock.adjust(300);
				expect(yield* passes(scripted)).toBeGreaterThan(before);
				const watchable = yield* changes.watchable("scripted");
				expect(watchable[0]?.observedAt).toEqual(row.observedAt);
				expect(watchable[0]?.stage).toBe("open");

				yield* hearsTheLanding(scripted, repo.id, 1_000);
			}),
		),
	);

	it.effect("asks less often the longer a host goes on failing", () =>
		watched(FALTERING, (scripted) =>
			Effect.gen(function* () {
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				yield* openedChange(piece.id, repo.name);
				yield* scripted.drive.refuse("the harbour master is asleep");

				const before = yield* passes(scripted);
				yield* TestClock.adjust(500);
				expect((yield* passes(scripted)) - before).toBeLessThan(12);

				yield* hearsTheLanding(scripted, repo.id, FALTERING.coldMillis);
			}),
		),
	);
});

const crewOn = (backend: ScriptedBackend, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined ? yield* Effect.fail("no crew yet") : yield* sessionFor(backend, row.agentId);
	});

describe("a chain gated on a change", () => {
	it.live("sails when the watcher sees the merge", () =>
		watched(BRISK, (scripted, backend) =>
			Effect.gen(function* () {
				const pieces = yield* Pieces;
				const domain = yield* AgentDomain;
				const repo = yield* domain.repos.register({
					defaultRef: "main",
					source: REEF_SOURCE,
				});
				const voyage = yield* openReefVoyage;
				const charter = (title: string, dependsOn: ReadonlyArray<string>) =>
					pieces.charter({
						charter: `do ${title}`,
						dependsOn,
						expectation: `${title} is landed`,
						role: "hand",
						title,
						voyageId: voyage.id,
					});
				const alpha = yield* charter("alpha", []);
				const bravo = yield* charter("bravo", [alpha.id]);
				yield* pieces.launch(alpha.id);
				yield* pieces.launch(bravo.id);

				const crew = yield* eventually(crewOn(backend, alpha.id));
				expect(
					yield* callTool(crew, "open_change", {
						body: "three fathoms at the eastern spit",
						repo: "reef",
						title: "chart the eastern spit",
					}),
				).toMatchObject({ ok: true });
				expect(yield* callTool(crew, "stand_down", undefined)).toEqual({
					ok: true,
					text: "standing by",
				});
				expect(yield* stateOf(voyage.id, alpha.id)).toBe("landing");
				expect(yield* stateOf(voyage.id, bravo.id)).toBe("blocked");

				yield* scripted.drive.transition(repo.id, "1", { stage: "landed" });

				yield* eventually(
					Effect.gen(function* () {
						expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");
						expect(yield* assignedPieces).toContain(bravo.id);
					}),
				);
			}),
		),
	);
});
