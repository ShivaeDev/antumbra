import { Database } from "@antumbra/persistence";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import type { ObserveCadenceOptions } from "#change-cadence.ts";
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

// why: the cadences under test are scaled down, never mocked — the loop these
// tests exercise is the one the app runs, only impatient enough to watch.
const SLOW = cadence(60_000, 60_000, 60_000);
const BRISK = cadence(50, 50, 60_000);

// why: the backoff ceiling is the cold cadence, so proving a run of failures
// reaches it needs a cold cadence a test can sit out — four steps above the
// warm one rather than a quarter of an hour.
const FALTERING = cadence(20, 20, 80);

const watched = <A, E, R>(cadence: ObserveCadenceOptions, body: (scripted: ScriptedHost, backend: ScriptedBackend) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const host = yield* makeScriptedHost();
		yield* body(host, backend).pipe(
			Effect.provide(
				watchingLayer(temporary, backend.backend, cadence, changeHostsOf(host.host), { maxAlive: 4, patienceMillis: 50 }, recorder.runner),
			),
		);
	});

const openedChange = (pieceId: string, repoName: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.changes.open({
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

const askedMoreThan = (scripted: ScriptedHost, count: number) =>
	TestClock.withLive(
		eventually(
			Effect.gen(function* () {
				expect(yield* passes(scripted)).toBeGreaterThan(count);
			}),
		),
	);

const hearsTheLanding = (scripted: ScriptedHost, repoId: string, delayMillis: number) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		yield* scripted.drive.refuse(null);
		yield* scripted.drive.transition(repoId, "1", { stage: "landed" });
		yield* TestClock.adjust(delayMillis);
		yield* TestClock.withLive(
			eventually(
				Effect.gen(function* () {
					expect((yield* domain.changes.watchableChanges("scripted")).length).toBe(0);
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
				// why: the piece is launched, so the pool may have put a hand on it
				// before the change row existed — whether it did is a race this test
				// has no stake in. A piece reads shipped only once its crew is
				// finished, so any hand is asked to stand down before the reading is
				// taken, and the loop settles the same way whether or not one came.
				yield* TestClock.withLive(
					eventually(
						Effect.gen(function* () {
							yield* Effect.ignore(standDownAll(backend));
							expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
						}),
					),
				);
				// why: nothing is open, so the loop drops to the cold cadence and
				// stops spending calls on a fleet that has nothing to say.
				yield* settled(scripted);
			}),
		),
	);

	it.effect("leaves rows untouched when a host will not answer", () =>
		watched(BRISK, (scripted) =>
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const row = yield* openedChange(piece.id, repo.name);
				yield* scripted.drive.refuse("the harbour master is asleep");

				const before = yield* passes(scripted);
				yield* TestClock.adjust(300);
				expect(yield* passes(scripted)).toBeGreaterThan(before);
				const watchable = yield* domain.changes.watchableChanges("scripted");
				expect(watchable[0]?.observedAt).toEqual(row.observedAt);
				expect(watchable[0]?.stage).toBe("open");

				// why: the loop is still alive — a host that starts answering again
				// is heard without anything being restarted.
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
				// why: at the cadence this fleet asks for, half a second of silence
				// would cost twenty-five passes. Backing off spends what 20, 40, 80
				// and the ceiling allow, and an outage costs the same shape of the
				// morning rather than one call every warm period of it.
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

// why: the whole page with nobody driving it — a crew opens a change through
// the tool and stands down, the merge happens where Antumbra cannot see it, and
// the chain still sails because the watcher asked again. Nothing in this test
// calls a refresh: if the loop is not running, it fails.
describe("a chain gated on a change", () => {
	it.live("sails when the watcher sees the merge", () =>
		watched(BRISK, (scripted, backend) =>
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const repo = yield* domain.repos.register({
					defaultRef: "main",
					source: REEF_SOURCE,
				});
				const voyage = yield* openReefVoyage;
				const charter = (title: string, dependsOn: ReadonlyArray<string>) =>
					domain.voyages.charterPiece({
						charter: `do ${title}`,
						dependsOn,
						expectation: `${title} is landed`,
						role: "hand",
						title,
						voyageId: voyage.id,
					});
				const alpha = yield* charter("alpha", []);
				const bravo = yield* charter("bravo", [alpha.id]);
				yield* domain.voyages.launch(alpha.id);
				yield* domain.voyages.launch(bravo.id);

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
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* stateOf(voyage.id, alpha.id)).toBe("landing");
						expect(yield* stateOf(voyage.id, bravo.id)).toBe("blocked");
					}),
				);

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
