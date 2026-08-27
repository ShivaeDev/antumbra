import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { verifyPieceExists } from "@antumbra/pieces";
import { decodeStoredMoorageStatus } from "@antumbra/vocabulary/agent-runtime";
import { Crypto, Effect, Option } from "effect";
import { ArtifactSourceNotOwned, artifactPublicationFailed } from "#errors.ts";
import { currentArtifactsForPiece } from "#lineage/current.ts";
import { validateCurrentStoredArtifactLineage } from "#lineage/piece-lineage.ts";
import { validateLandingSupersession } from "#lineage/validation.ts";
import type {
	ArtifactInput,
	ArtifactLanding,
	ArtifactPublication,
	ArtifactRow,
} from "#model.ts";
import { publishArtifact } from "#publication.ts";

const requireCurrentMoorage = (publication: ArtifactPublication) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Moorage.where({
			agentId: publication.agentId,
		}).first();
		if (Option.isNone(row)) {
			return yield* new ArtifactSourceNotOwned({
				agentId: publication.agentId,
				path: publication.basename,
			});
		}
		const status = yield* Effect.fromResult(
			decodeStoredMoorageStatus(row.value.agentId, row.value.status),
		);
		if (status !== "ready" || row.value.root !== publication.moorageRoot) {
			return yield* new ArtifactSourceNotOwned({
				agentId: publication.agentId,
				path: publication.basename,
			});
		}
	});

const writeArtifact = (
	row: ArtifactRow,
	input: ArtifactInput,
	publication: ArtifactPublication,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* validateCurrentStoredArtifactLineage(input.pieceId);
		yield* verifyPieceExists(input.pieceId);
		yield* requireCurrentMoorage(publication);
		if (input.supersedesArtifactId !== undefined) {
			yield* validateLandingSupersession(
				input.supersedesArtifactId,
				row.id,
				input.pieceId,
			);
		}
		yield* db.Artifact.create({
			...row,
		});
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
			otherCurrentArtifacts: current.filter(
				(artifact) => artifact.id !== row.id,
			),
		} satisfies ArtifactLanding;
	});

export const landArtifact = (root: string, input: ArtifactInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const crypto = yield* Crypto.Crypto;
		const feeds = yield* DomainFeeds;
		const id = yield* crypto.randomUUIDv4.pipe(
			Effect.mapError(artifactPublicationFailed("identify artifact")),
		);
		yield* verifyPieceExists(input.pieceId);
		yield* validateCurrentStoredArtifactLineage(input.pieceId);
		if (input.supersedesArtifactId !== undefined) {
			yield* validateLandingSupersession(
				input.supersedesArtifactId,
				id,
				input.pieceId,
			);
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
		const write = writeArtifact(row, input, publication);
		const landing = yield* input.supersedesArtifactId === undefined
			? write
			: db.transaction(write);
		yield* feeds.publishVoyageRefresh();
		return landing;
	});
