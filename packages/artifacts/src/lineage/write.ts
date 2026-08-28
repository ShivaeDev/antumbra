import { Database, type PrismaError } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import {
	ArtifactLineageConflict,
	ArtifactSupersessionNotFound,
} from "#errors.ts";
import { readValidStoredArtifactLineage } from "#lineage/piece-lineage.ts";
import {
	cycleWouldForm,
	requireArtifact,
	requireAuthority,
	requireSharedPiece,
} from "#lineage/validation.ts";
import type { ArtifactSupersessionInput } from "#model.ts";

const recoverSupersessionWrite = (
	input: ArtifactSupersessionInput,
	failure: PrismaError,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const claimed = yield* db.Artifact.where({
			supersededByArtifactId: input.successorArtifactId,
		}).exists();
		if (claimed) {
			return yield* new ArtifactLineageConflict({
				conflict: "successor_artifact_already_has_predecessor",
				successorArtifactId: input.successorArtifactId,
				supersededArtifactId: input.supersededArtifactId,
			});
		}
		return yield* failure;
	});

export const writeSupersession = (input: ArtifactSupersessionInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded, successor);
		const { artifacts } = yield* readValidStoredArtifactLineage(
			superseded.pieceId,
		);
		if (superseded.supersededByArtifactId === successor.id) {
			return;
		}
		if (superseded.supersededByArtifactId !== null) {
			return yield* new ArtifactLineageConflict({
				conflict: "superseded_artifact_already_has_successor",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		const existingPredecessor = yield* db.Artifact.where({
			supersededByArtifactId: successor.id,
		}).first();
		if (Option.isSome(existingPredecessor)) {
			return yield* new ArtifactLineageConflict({
				conflict: "successor_artifact_already_has_predecessor",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		if (
			cycleWouldForm(
				artifacts,
				input.supersededArtifactId,
				input.successorArtifactId,
			)
		) {
			return yield* new ArtifactLineageConflict({
				conflict: "cycle",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		const updated = yield* db.Artifact.where({
			id: superseded.id,
			supersededByArtifactId: null,
		})
			.update({ supersededByArtifactId: successor.id })
			.pipe(
				Effect.catchTag("PrismaError", (failure) =>
					recoverSupersessionWrite(input, failure),
				),
			);
		if (updated === null) {
			const current = yield* requireArtifact(input.supersededArtifactId);
			if (current.supersededByArtifactId !== input.successorArtifactId) {
				return yield* new ArtifactLineageConflict({
					conflict: "superseded_artifact_already_has_successor",
					successorArtifactId: input.successorArtifactId,
					supersededArtifactId: input.supersededArtifactId,
				});
			}
		}
	});

export const deleteSupersession = (input: ArtifactSupersessionInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded, successor);
		yield* readValidStoredArtifactLineage(superseded.pieceId);
		if (superseded.supersededByArtifactId === null) {
			return;
		}
		if (superseded.supersededByArtifactId !== input.successorArtifactId) {
			return yield* new ArtifactSupersessionNotFound({
				successorArtifactId: input.successorArtifactId,
				supersededArtifactId: input.supersededArtifactId,
			});
		}
		const updated = yield* db.Artifact.where({
			id: input.supersededArtifactId,
			supersededByArtifactId: input.successorArtifactId,
		}).update({ supersededByArtifactId: null });
		if (updated === null) {
			const current = yield* requireArtifact(input.supersededArtifactId);
			if (current.supersededByArtifactId !== null) {
				return yield* new ArtifactSupersessionNotFound({
					successorArtifactId: input.successorArtifactId,
					supersededArtifactId: input.supersededArtifactId,
				});
			}
		}
	});
