import { Database } from "@antumbra/persistence";
import {
	allowTestChangeUpdates,
	rejectTestChangeUpdates,
} from "@antumbra/persistence/testing";
import {
	ChangeHostUnavailable,
	type OpenChangeRequest,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { readBerthSweep } from "#berth-sweep-read.ts";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import {
	CREW,
	HEAD,
	openedChange,
	submittedChange,
	withHost,
} from "#test/change-submission-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import {
	makeScriptedHost,
	type ScriptedHost,
	scriptedObservation,
} from "#test/scripted-host.ts";

const hostThatLosesFirstResponse = (scripted: ScriptedHost) => {
	let loseResponse = true;
	return {
		...scripted.host,
		open: (request: OpenChangeRequest) =>
			scripted.host.open(request).pipe(
				Effect.flatMap((observation) => {
					if (!loseResponse) {
						return Effect.succeed(observation);
					}
					loseResponse = false;
					return new ChangeHostUnavailable({
						detail: "response lost after acceptance",
						host: scripted.host.tag,
					});
				}),
			),
	};
};

it.live("concurrent submissions reuse one active change", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);

			const rows = yield* Effect.all(
				[
					submittedChange(piece.id, repo.name),
					submittedChange(piece.id, repo.name),
				],
				{ concurrency: "unbounded" },
			);

			expect(rows[1]?.id).toBe(rows[0]?.id);
			expect(rows[0]).toMatchObject({
				externalId: null,
				headRef: HEAD,
				headSha: `sha-${HEAD}`,
				host: "scripted",
				preparedHeadRef: HEAD,
				preparedHeadSha: `sha-${HEAD}`,
				stage: "prepared",
				workingDiff: "",
				workingTreeStatus: "",
				worktreePath: `/tmp/moorage/${CREW}/berth-0`,
			});
			expect(yield* db.Change.all()).toHaveLength(1);
			expect(yield* db.PieceChange.all()).toEqual([
				{
					changeId: rows[0]?.id,
					pieceId: piece.id,
					purpose: "produces",
				},
			]);
			expect(yield* scripted.drive.opened).toHaveLength(0);
		}),
	),
);

it.live(
	"a lost host response leaves one durable change that retry enriches",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const scripted = yield* makeScriptedHost();
			const host = hostThatLosesFirstResponse(scripted);
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);

				const lost = yield* Effect.flip(openedChange(piece.id, repo.name));
				expect(lost._tag).toBe("ChangeHostUnavailable");
				const prepared = yield* db.Change.all();
				expect(prepared).toHaveLength(1);
				expect(prepared[0]?.stage).toBe("prepared");

				const row = yield* openedChange(piece.id, repo.name);
				expect(row.id).toBe(prepared[0]?.id);
				expect(row.stage).toBe("open");
				expect(yield* db.Change.all()).toHaveLength(1);
				expect(yield* scripted.drive.opened).toHaveLength(1);
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend.backend,
						{},
						passiveRunner,
						changeHostsOf(host),
					),
				),
			);
		}),
);

it.live(
	"a rejected write after host acceptance retries onto the same prepared change",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const scripted = yield* makeScriptedHost();
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				yield* Effect.sync(() => rejectTestChangeUpdates(temporary.database));

				const lost = yield* Effect.flip(openedChange(piece.id, repo.name));
				expect(lost._tag).toBe("PrismaError");
				const prepared = yield* db.Change.all();
				expect(prepared).toHaveLength(1);
				expect(prepared[0]?.stage).toBe("prepared");
				expect(yield* scripted.drive.opened).toHaveLength(1);

				yield* Effect.sync(() => allowTestChangeUpdates(temporary.database));
				const row = yield* openedChange(piece.id, repo.name);
				expect(row.id).toBe(prepared[0]?.id);
				expect(row.externalId).toBe("1");
				expect(yield* db.Change.all()).toHaveLength(1);
				expect(yield* scripted.drive.opened).toHaveLength(1);
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend.backend,
						{},
						passiveRunner,
						changeHostsOf(scripted.host),
					),
				),
			);
		}),
);

it.live(
	"prepared truth survives rebuilt persistence and continues to hold its berth",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const scripted = yield* makeScriptedHost();
			const layer = () =>
				domainKernelLayer(
					temporary,
					backend.backend,
					{},
					passiveRunner,
					changeHostsOf(scripted.host),
				);
			const first = yield* Effect.gen(function* () {
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const row = yield* submittedChange(piece.id, repo.name);
				return { piece, repo, row };
			}).pipe(Effect.provide(layer()));

			const rebuilt = yield* Effect.gen(function* () {
				const db = yield* Database;
				const row = yield* submittedChange(first.piece.id, first.repo.name);
				const sweep = yield* readBerthSweep;
				return { all: yield* db.Change.all(), row, sweep };
			}).pipe(Effect.provide(layer()));

			expect(rebuilt.row.id).toBe(first.row.id);
			expect(rebuilt.all).toHaveLength(1);
			expect(rebuilt.sweep.held.get(`${CREW}:berth-0`)).toBe(first.row.id);
		}),
);

it.live(
	"an exact later observation enriches the prepared id and an unknown one creates nothing",
	() =>
		withHost(() =>
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const prepared = yield* submittedChange(piece.id, repo.name);
				const exact = {
					...scriptedObservation("scripted", "41", {
						baseRef: "main",
						headRef: HEAD,
						repoId: repo.id,
						title: "observed later",
					}),
					headSha: `sha-${HEAD}`,
				};
				const attached = yield* domain.changes.observed("scripted", [exact]);
				expect(attached).toHaveLength(1);
				expect(attached[0]).toMatchObject({
					externalId: "41",
					id: prepared.id,
					stage: "open",
				});

				const unknown = scriptedObservation("scripted", "42", {
					baseRef: "main",
					headRef: "work/unknown",
					repoId: repo.id,
					title: "not submitted",
				});
				expect(yield* domain.changes.observed("scripted", [unknown])).toEqual(
					[],
				);
				expect(yield* db.Change.all()).toHaveLength(1);
			}),
		),
);

it.live("a withdrawn change releases the next submission identity", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const first = yield* openedChange(piece.id, repo.name);
			yield* scripted.drive.transition(repo.id, "1", { stage: "withdrawn" });
			expect((yield* domain.changes.refresh("scripted"))[0]?.stage).toBe(
				"withdrawn",
			);

			const replacement = yield* submittedChange(piece.id, repo.name);
			expect(replacement.id).not.toBe(first.id);
			expect(replacement.stage).toBe("prepared");
			expect(yield* db.Change.all()).toHaveLength(2);
		}),
	),
);
