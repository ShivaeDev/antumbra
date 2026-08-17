import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { validateStoredArtifactLineage } from "#lineage/stored.ts";
import type { ArtifactRow, ArtifactSupersessionRow } from "#model.ts";

const edgeEntry = (edge: ArtifactSupersessionRow) =>
	[
		JSON.stringify([edge.supersededArtifactId, edge.successorArtifactId]),
		edge,
	] as const;

const lineageEdges = (artifacts: ReadonlyArray<ArtifactRow>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const queried = yield* Effect.forEach(artifacts, (artifact) =>
			Effect.all([
				db.ArtifactSupersession.where({
					successorArtifactId: artifact.id,
				}).all(),
				db.ArtifactSupersession.where({
					supersededArtifactId: artifact.id,
				}).all(),
			]),
		);
		return [...new Map(queried.flat(2).map(edgeEntry)).values()];
	});

export const readValidStoredArtifactLineage = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const ownArtifacts = yield* db.Artifact.where({ pieceId }).all();
		const pieceExists = yield* db.Piece.where({ id: pieceId }).exists();
		const supersessions = yield* lineageEdges(ownArtifacts);
		const ownIds = new Set(ownArtifacts.map((artifact) => artifact.id));
		const counterpartIds = new Set(
			supersessions.flatMap((edge) => [
				edge.supersededArtifactId,
				edge.successorArtifactId,
			]),
		);
		const counterparts = yield* Effect.forEach(
			[...counterpartIds].filter((artifactId) => !ownIds.has(artifactId)),
			(artifactId) => db.Artifact.where({ id: artifactId }).first(),
		);
		const lineage = {
			artifacts: [
				...ownArtifacts,
				...counterparts.filter(Option.isSome).map((stored) => stored.value),
			],
			pieceIds: new Set(pieceExists ? [pieceId] : []),
			supersessions,
		};
		yield* validateStoredArtifactLineage(lineage);
		return lineage;
	});

export const validateCurrentStoredArtifactLineage = (pieceId: string) =>
	readValidStoredArtifactLineage(pieceId).pipe(Effect.asVoid);
