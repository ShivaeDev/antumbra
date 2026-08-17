import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import {
	CREW,
	openedChange,
	withHost,
} from "#test/change-submission-fixtures.ts";
import { observed, storedChange } from "#test/change-transition-fixtures.ts";

it.live("freshness wins when one batch carries newer then stale news", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);

			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 2, { stage: "landed" }),
				observed(row, repo.id, 1, { stage: "open", title: "stale" }),
			]);

			expect((yield* storedChange(row.id)).stage).toBe("landed");
		}),
	),
);

it.live("freshness wins across concurrent observation calls", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);
			const pair = [
				observed(row, repo.id, 2, { stage: "landed" }),
				observed(row, repo.id, 1, { stage: "open", title: "stale" }),
			];

			yield* Effect.all(
				pair.map((one) => domain.changes.observed("scripted", [one])),
				{ concurrency: "unbounded" },
			);

			expect((yield* storedChange(row.id)).stage).toBe("landed");
		}),
	),
);
