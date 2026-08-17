import { decodeStoredMoorageStatus } from "@antumbra/agent-runtime-vocabulary";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { requirePiece } from "@antumbra/pieces";
import { Crypto, Effect, Option, PubSub } from "effect";
import { ArtifactSourceNotOwned, artifactPublicationFailed } from "#errors.ts";
import type {
	ArtifactInput,
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
	pieceId: string,
	publication: ArtifactPublication,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* requirePiece(pieceId);
		yield* requireCurrentMoorage(publication);
		yield* db.Artifact.create(row);
		yield* db.PieceArtifact.create({ artifactId: row.id, pieceId });
	});

export const landArtifact = (root: string, input: ArtifactInput) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const publication = yield* publishArtifact(root, input);
		const row: ArtifactRow = {
			authorAgentId: input.authorAgentId ?? null,
			id: yield* crypto.randomUUIDv4.pipe(
				Effect.mapError(artifactPublicationFailed("identify artifact")),
			),
			title: input.title,
			uri: publication.uri,
		};
		yield* writer.write(writeArtifact(row, input.pieceId, publication));
		yield* PubSub.publish(feeds.voyages, undefined);
		return row;
	});
