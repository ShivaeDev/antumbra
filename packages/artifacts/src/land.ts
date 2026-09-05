import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { verifyPieceExists } from "@antumbra/pieces";
import { Crypto, Effect } from "effect";
import { artifactPublicationFailed } from "#errors.ts";
import { currentArtifactsForPiece } from "#lineage/current.ts";
import { validateLandingSupersession } from "#lineage/validation.ts";
import type { ArtifactInput, ArtifactLanding, ArtifactRow } from "#model.ts";
import { publishArtifact } from "#publication.ts";
import { ArtifactStorage } from "#storage.ts";

const writeArtifact = Effect.fnUntraced(function* (row: ArtifactRow, input: ArtifactInput) {
	const db = yield* Database;
	yield* db.Artifact.create(row);
	if (input.supersedesArtifactId !== undefined) {
		yield* db.Artifact.where({ id: input.supersedesArtifactId }).update({
			supersededByArtifactId: row.id,
		});
		return {
			_tag: "superseded",
			artifact: row,
			supersededArtifactId: input.supersedesArtifactId,
		} satisfies ArtifactLanding;
	}
	const current = yield* currentArtifactsForPiece(input.pieceId);
	return {
		_tag: "landed",
		artifact: row,
		otherCurrentArtifacts: current.filter((artifact) => artifact.id !== row.id),
	} satisfies ArtifactLanding;
});

export const landArtifact = Effect.fn("Artifacts.land")(function* (input: ArtifactInput) {
	const { root } = yield* ArtifactStorage;
	const crypto = yield* Crypto.Crypto;
	const feeds = yield* DomainFeeds;
	const id = yield* crypto.randomUUIDv4.pipe(Effect.mapError(artifactPublicationFailed("identify artifact")));
	yield* verifyPieceExists(input.pieceId);
	if (input.supersedesArtifactId !== undefined) {
		yield* validateLandingSupersession(input.supersedesArtifactId, id, input.pieceId);
	}
	const publication = yield* publishArtifact(root, input);
	const row: ArtifactRow = {
		authorAgentId: input.authorAgentId ?? null,
		basename: publication.basename,
		byteSize: publication.byteSize,
		digest: publication.digest,
		id,
		pieceId: input.pieceId,
		supersededByArtifactId: null,
		title: input.title,
	};
	const landing = yield* writeArtifact(row, input);
	yield* feeds.publishVoyageRefresh();
	return landing;
});
