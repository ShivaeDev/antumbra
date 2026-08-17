import { decodeStoredMoorageStatus } from "@antumbra/agent-runtime-vocabulary";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { verifyPieceExists } from "@antumbra/pieces";
import { Crypto, Effect, Option, PubSub } from "effect";
import { ArtifactSourceNotOwned, artifactPublicationFailed } from "#errors.ts";
import { currentArtifactsForPiece } from "#lineage/current.ts";
import { validateCurrentStoredArtifactLineage } from "#lineage/stored.ts";
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
		if (publication._tag === "external") {
			return;
		}
		const db = yield* Database;
		const row = yield* db.Moorage.where({
			agentId: publication.agentId,
		}).first();
		if (Option.isNone(row)) {
			return yield* new ArtifactSourceNotOwned({
				agentId: publication.agentId,
				uri: publication.uri,
			});
		}
		const status = yield* Effect.fromResult(
			decodeStoredMoorageStatus(row.value.agentId, row.value.status),
		);
		if (status !== "ready" || row.value.root !== publication.moorageRoot) {
			return yield* new ArtifactSourceNotOwned({
				agentId: publication.agentId,
				uri: publication.uri,
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
		yield* validateCurrentStoredArtifactLineage;
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
			pieces: (pieces) => pieces.create({ pieceId: input.pieceId }),
		});
		if (input.supersedesArtifactId !== undefined) {
			yield* db.ArtifactSupersession.create({
				successorArtifactId: row.id,
				supersededArtifactId: input.supersedesArtifactId,
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
		const crypto = yield* Crypto.Crypto;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const id = yield* crypto.randomUUIDv4.pipe(
			Effect.mapError(artifactPublicationFailed("identify artifact")),
		);
		yield* verifyPieceExists(input.pieceId);
		yield* validateCurrentStoredArtifactLineage;
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
			id,
			title: input.title,
			uri: publication.uri,
		};
		const landing = yield* writer.write(writeArtifact(row, input, publication));
		yield* PubSub.publish(feeds.voyages, undefined);
		return landing;
	});
