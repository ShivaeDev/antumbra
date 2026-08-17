import { Database } from "@antumbra/persistence";
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
import type {
	ArtifactSupersessionInput,
	ArtifactSupersessionRow,
} from "#model.ts";

export const writeSupersession = (input: ArtifactSupersessionInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded, successor);
		const { supersessions } = yield* readValidStoredArtifactLineage(
			superseded.pieceId,
		);
		const existingSuccessor = yield* db.ArtifactSupersession.where({
			supersededArtifactId: superseded.id,
		}).first();
		if (
			Option.isSome(existingSuccessor) &&
			existingSuccessor.value.successorArtifactId === successor.id
		) {
			return existingSuccessor.value;
		}
		if (Option.isSome(existingSuccessor)) {
			return yield* new ArtifactLineageConflict({
				conflict: "superseded_artifact_already_has_successor",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		if (
			yield* db.ArtifactSupersession.where({
				successorArtifactId: successor.id,
			}).exists()
		) {
			return yield* new ArtifactLineageConflict({
				conflict: "successor_artifact_already_has_predecessor",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		if (
			cycleWouldForm(
				supersessions,
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
		const row: ArtifactSupersessionRow = {
			successorArtifactId: successor.id,
			supersededArtifactId: superseded.id,
		};
		yield* db.ArtifactSupersession.create(row);
		return row;
	});

export const deleteSupersession = (input: ArtifactSupersessionInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded, successor);
		yield* readValidStoredArtifactLineage(superseded.pieceId);
		const edge = yield* db.ArtifactSupersession.where({
			supersededArtifactId: input.supersededArtifactId,
		}).first();
		if (Option.isNone(edge)) {
			return;
		}
		if (edge.value.successorArtifactId !== input.successorArtifactId) {
			return yield* new ArtifactSupersessionNotFound({
				successorArtifactId: input.successorArtifactId,
				supersededArtifactId: input.supersededArtifactId,
			});
		}
		yield* db.ArtifactSupersession.where({
			supersededArtifactId: input.supersededArtifactId,
		}).deleteAll();
	});
