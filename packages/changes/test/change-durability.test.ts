import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import {
	allowTestChangeUpdates,
	rejectTestChangeUpdates,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	acquireTemporaryPersistence,
	CREW,
	changesLayer,
	createBerth,
	createPiece,
	createRepo,
	makeScriptedHost,
	REEF_SOURCE,
} from "#test/change-harness.ts";

const seed = Effect.all([
	createRepo("repo-reef", "reef", REEF_SOURCE),
	createPiece("piece-reef"),
	createBerth(CREW),
]);

const opened = Effect.flatMap(Changes, (changes) =>
	changes.open({
		agentId: CREW,
		base: "main",
		body: "soundings",
		draft: false,
		pieceId: "piece-reef",
		repoName: "reef",
		sessionId: "session-crew",
		title: "Chart the reef",
	}),
);

it.live(
	"retries one prepared Change after its accepted write is rejected",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedHost;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				yield* seed;
				yield* Effect.sync(() => rejectTestChangeUpdates(temporary.database));
				const failure = yield* Effect.flip(opened);
				expect(failure._tag).toBe("PrismaError");
				const [prepared] = yield* db.Change.all();
				expect(prepared?.stage).toBe("prepared");
				yield* Effect.sync(() => allowTestChangeUpdates(temporary.database));
				const row = yield* opened;
				expect(row.id).toBe(prepared?.id);
				expect(yield* db.Change.all()).toHaveLength(1);
				expect(yield* scripted.opened).toHaveLength(1);
			}).pipe(
				Effect.provide(changesLayer([scripted.host])),
				Effect.provide(temporary.layer),
			);
		}),
);

it.live("rebuilds prepared truth and keeps its Berth held", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedHost;
		const layer = () => changesLayer([scripted.host]);
		const first = yield* Effect.gen(function* () {
			yield* seed;
			const changes = yield* Changes;
			return yield* changes.submit({
				agentId: CREW,
				pieceId: "piece-reef",
				repoName: "reef",
				sessionId: "session-crew",
			});
		}).pipe(Effect.provide(layer()), Effect.provide(temporary.layer));

		const rebuilt = yield* Effect.gen(function* () {
			const changes = yield* Changes;
			const db = yield* Database;
			const row = yield* changes.submit({
				agentId: CREW,
				pieceId: "piece-reef",
				repoName: "reef",
				sessionId: "session-crew",
			});
			const berths = yield* db.Berth.where({ agentId: CREW }).all();
			return {
				held: yield* changes.heldResources(berths),
				row,
			};
		}).pipe(Effect.provide(layer()), Effect.provide(temporary.layer));

		expect(rebuilt.row.id).toBe(first.id);
		expect(rebuilt.held.get(`${CREW}:berth-0`)).toBe(first.id);
	}),
);
