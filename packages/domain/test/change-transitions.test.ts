import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import {
	CREW,
	openedChange,
	withHost,
} from "#test/change-submission-fixtures.ts";
import {
	observed,
	storedChange,
	storedTransitions,
} from "#test/change-transition-fixtures.ts";

it.live("a newer reopen advances the same durable change", () =>
	withHost(() =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);

			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 1, { stage: "withdrawn" }),
			]);
			const [reopened] = yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 2, { stage: "open" }),
			]);

			expect(reopened?.id).toBe(row.id);
			expect(reopened?.stage).toBe("open");
			expect(yield* db.Change.all()).toHaveLength(1);
			const transitions = yield* storedTransitions(row.id);
			expect(
				transitions
					.toSorted(
						(left, right) =>
							left.activityAt.getTime() - right.activityAt.getTime(),
					)
					.map((transition) => [transition.fromStage, transition.toStage]),
			).toEqual([
				["prepared", "open"],
				["open", "withdrawn"],
				["withdrawn", "open"],
			]);
		}),
	),
);

it.live("a landed fact wins when the host timestamp ties the open fact", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);
			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 0, { stage: "landed" }),
			]);
			expect((yield* storedChange(row.id)).stage).toBe("landed");
			const transitions = yield* storedTransitions(row.id);
			expect(transitions.map((transition) => transition.id)).toEqual([
				`${row.id}:${row.activityAt.getTime()}:open`,
				`${row.id}:${row.activityAt.getTime()}:landed`,
			]);
		}),
	),
);

it.live("equal-time same-stage facts refresh the projection exactly once", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);
			const fact = observed(row, repo.id, 0, {
				checks: "green",
				mergeable: "clean",
				raw: { checks: "finished" },
				review: "approved",
				title: "chart approved",
			});
			const expected = {
				checks: "green",
				mergeable: "clean",
				raw: '{"checks":"finished"}',
				review: "approved",
				title: "chart approved",
			};
			const [first] = yield* domain.changes.observed("scripted", [fact]);
			yield* Effect.sleep("10 millis");
			const [replayed] = yield* domain.changes.observed("scripted", [fact]);
			const stored = yield* storedChange(row.id);
			expect(first).toMatchObject(expected);
			expect(stored).toMatchObject(expected);
			expect(replayed?.observedAt).toEqual(first?.observedAt);
			expect(yield* storedTransitions(row.id)).toHaveLength(1);
		}),
	),
);

it.live(
	"equal-time withdrawal and reopen facts apply once in observed order",
	() =>
		withHost(() =>
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const row = yield* openedChange(piece.id, repo.name);
				const withdrawn = observed(row, repo.id, 1, { stage: "withdrawn" });
				const reopened = observed(row, repo.id, 1, { stage: "open" });
				yield* domain.changes.observed("scripted", [withdrawn]);
				yield* domain.changes.observed("scripted", [reopened]);
				yield* domain.changes.observed("scripted", [withdrawn]);
				expect((yield* storedChange(row.id)).stage).toBe("open");
				const transitions = yield* storedTransitions(row.id);
				expect(
					transitions.map((transition) => transition.id).toSorted(),
				).toEqual([
					`${row.id}:${row.activityAt.getTime()}:open`,
					`${row.id}:${withdrawn.activityAt}:open`,
					`${row.id}:${withdrawn.activityAt}:withdrawn`,
				]);
			}),
		),
);

it.live("landed is irreversible even when a newer observation says open", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);

			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 1, { stage: "landed" }),
			]);
			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 2, { stage: "open" }),
			]);

			expect((yield* storedChange(row.id)).stage).toBe("landed");
		}),
	),
);

it.live("replaying one transition keeps one stable event identity", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);
			const withdrawn = observed(row, repo.id, 1, { stage: "withdrawn" });

			yield* domain.changes.observed("scripted", [withdrawn]);
			yield* domain.changes.observed("scripted", [withdrawn]);

			const transitions = yield* storedTransitions(row.id);
			expect(transitions).toHaveLength(2);
			expect(transitions[1]?.id).toBe(
				`${row.id}:${withdrawn.activityAt}:withdrawn`,
			);
		}),
	),
);

it.live("a withdrawn change remains pollable so reopening is reconciled", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);

			yield* scripted.drive.transition(repo.id, "1", {
				stage: "withdrawn",
			});
			expect((yield* domain.changes.refresh("scripted"))[0]?.stage).toBe(
				"withdrawn",
			);
			yield* scripted.drive.transition(repo.id, "1", { stage: "open" });
			yield* domain.changes.refresh("scripted");

			expect((yield* storedChange(row.id)).stage).toBe("open");
		}),
	),
);
