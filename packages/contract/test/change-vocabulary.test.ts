import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { ChangeView } from "#index.ts";

const VALID = {
	activityAt: "2026-08-17T00:00:00.000Z",
	checks: "green",
	externalId: "61",
	host: "github",
	id: "change-61",
	isDraft: false,
	mergeable: "clean",
	observedAt: "2026-08-17T00:00:00.000Z",
	repoId: "repo-antumbra",
	repoName: "antumbra",
	review: "approved",
	stage: "open",
	title: "submit one durable change",
	url: "https://github.test/antumbra/pull/61",
};

it.effect("rejects widened Change vocabulary at the public boundary", () =>
	Effect.gen(function* () {
		const invalid = [
			["checks", "future_checks"],
			["mergeable", "future_mergeability"],
			["review", "future_review"],
			["stage", "future_stage"],
		] as const;
		for (const [field, word] of invalid) {
			const failure = yield* Effect.flip(
				Schema.decodeUnknownEffect(ChangeView)({ ...VALID, [field]: word }),
			);
			expect(String(failure)).toContain(`["${field}"]`);
		}
	}),
);
