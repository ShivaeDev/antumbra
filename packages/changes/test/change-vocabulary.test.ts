import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { changeOf } from "#test/change-fixtures.ts";

it.effect("refuses every unknown durable Change vocabulary field", () =>
	Effect.gen(function* () {
		const base = changeOf({
			headRef: "work/agent/reef",
			id: "change-1",
			repoId: "repo-1",
			stage: "open",
		});
		const invalid = [
			["checks", "future_checks"],
			["mergeable", "future_mergeability"],
			["review", "future_review"],
			["stage", "future_stage"],
		] as const;
		for (const [field, word] of invalid) {
			const failure = yield* Effect.flip(changeRow({ ...base, [field]: word }));
			expect(failure).toMatchObject({
				_tag: "StoredChangeInvalid",
				changeId: "change-1",
			});
			expect(failure.detail).toContain(word);
		}
	}),
);

it.effect("refuses an unknown durable PieceChange purpose", () =>
	Effect.gen(function* () {
		const failure = yield* Effect.flip(
			pieceChangeRow({
				changeId: "change-1",
				pieceId: "piece-1",
				purpose: "future_purpose",
			}),
		);
		expect(failure).toMatchObject({
			_tag: "StoredPieceChangeInvalid",
			changeId: "change-1",
			pieceId: "piece-1",
		});
		expect(failure.detail).toContain("future_purpose");
	}),
);
