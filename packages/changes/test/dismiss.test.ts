import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
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

it.live("a change that died at its host is dismissed once and stays so", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedHost;
		yield* Effect.gen(function* () {
			const changes = yield* Changes;
			const db = yield* Database;
			yield* seed;
			const row = yield* opened;
			yield* scripted.transition("repo-reef", "1", { stage: "withdrawn" });
			yield* changes.refresh("scripted");

			yield* changes.dismiss(row.id);
			yield* changes.dismiss(row.id);

			const verdicts = yield* db.ChangeVerdict.all();
			expect(verdicts).toHaveLength(1);
			expect(verdicts[0]?.verdict).toBe("dismissed");
			// why: the verdict settles what the change is owed; it never edits
			// what happened to it, so the stage still reads as it died.
			const [after] = yield* db.Change.where({ id: row.id }).all();
			expect(after?.stage).toBe("withdrawn");
			expect(yield* changes.snapshot).toMatchObject({
				dismissedChangeIds: new Set([row.id]),
			});
		}).pipe(
			Effect.provide(changesLayer([scripted.host])),
			Effect.provide(temporary.layer),
		);
	}),
);

it.live("a change still alive at its host has nothing to dismiss", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedHost;
		yield* Effect.gen(function* () {
			const changes = yield* Changes;
			const db = yield* Database;
			yield* seed;
			const row = yield* opened;

			const refused = yield* Effect.flip(changes.dismiss(row.id));

			expect(refused._tag).toBe("ChangeStillAlive");
			expect(yield* db.ChangeVerdict.all()).toEqual([]);
		}).pipe(
			Effect.provide(changesLayer([scripted.host])),
			Effect.provide(temporary.layer),
		);
	}),
);

it.live("a change nobody has heard of is refused by name", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedHost;
		yield* Effect.gen(function* () {
			const changes = yield* Changes;
			yield* seed;

			const refused = yield* Effect.flip(changes.dismiss("no-such-change"));

			expect(refused._tag).toBe("ChangeNotFound");
		}).pipe(
			Effect.provide(changesLayer([scripted.host])),
			Effect.provide(temporary.layer),
		);
	}),
);
