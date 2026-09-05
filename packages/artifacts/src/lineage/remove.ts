import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { ArtifactSupersessionNotFound } from "#errors.ts";
import { requireArtifact, requireAuthority, requireSharedPiece } from "#lineage/validation.ts";
import type { ArtifactSupersessionInput } from "#model.ts";

export const deleteSupersession = Effect.fn("Artifacts.removeSupersession")(
	function* (input: ArtifactSupersessionInput) {
		const db = yield* Database;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded, successor);
		if (superseded.supersededByArtifactId === null) {
			return;
		}
		if (superseded.supersededByArtifactId !== input.successorArtifactId) {
			return yield* new ArtifactSupersessionNotFound({
				successorArtifactId: input.successorArtifactId,
				supersededArtifactId: input.supersededArtifactId,
			});
		}
		yield* db.Artifact.where({ id: input.supersededArtifactId }).update({ supersededByArtifactId: null });
	},
	Effect.tap(() => Effect.flatMap(DomainFeeds, (feeds) => feeds.publishVoyageRefresh())),
);
