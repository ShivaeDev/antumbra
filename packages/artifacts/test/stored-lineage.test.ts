import { validateStoredArtifactLineage } from "@antumbra/artifacts";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

const artifact = (id: string, supersededByArtifactId: string | null) => ({
	authorAgentId: "agent-chart",
	id,
	pieceId: "piece-chart",
	supersededByArtifactId,
	title: id,
	uri: `https://example.test/${id}.svg`,
});

const failureOf = (artifacts: ReadonlyArray<ReturnType<typeof artifact>>) =>
	Effect.flip(
		validateStoredArtifactLineage({
			artifacts,
			pieceIds: new Set(["piece-chart"]),
		}),
	);

it.effect("refuses a stored lineage whose successor is missing", () =>
	Effect.gen(function* () {
		const failure = yield* failureOf([
			artifact("artifact-old", "artifact-missing"),
		]);

		expect(failure).toMatchObject({
			_tag: "StoredArtifactLineageInvalid",
			reason: "endpoint",
		});
	}),
);

it.effect(
	"refuses stored convergence despite the normal unique constraint",
	() =>
		Effect.gen(function* () {
			const failure = yield* failureOf([
				artifact("artifact-one", "artifact-new"),
				artifact("artifact-two", "artifact-new"),
				artifact("artifact-new", null),
			]);

			expect(failure).toMatchObject({
				_tag: "StoredArtifactLineageInvalid",
				reason: "branch",
			});
		}),
);
