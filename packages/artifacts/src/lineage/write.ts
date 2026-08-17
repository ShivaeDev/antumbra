import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import {
	ArtifactLineageConflict,
	ArtifactSupersessionNotFound,
} from "#errors.ts";
import { validateCurrentStoredArtifactLineage } from "#lineage/stored.ts";
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
		yield* validateCurrentStoredArtifactLineage;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded.id, successor.id);
		const edges = yield* db.ArtifactSupersession.all();
		const replayed = edges.find(
			(edge) =>
				edge.supersededArtifactId === input.supersededArtifactId &&
				edge.successorArtifactId === input.successorArtifactId,
		);
		if (replayed !== undefined) {
			return replayed;
		}
		if (
			edges.some(
				(edge) => edge.supersededArtifactId === input.supersededArtifactId,
			)
		) {
			return yield* new ArtifactLineageConflict({
				conflict: "superseded_artifact_already_has_successor",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		if (
			edges.some(
				(edge) => edge.successorArtifactId === input.successorArtifactId,
			)
		) {
			return yield* new ArtifactLineageConflict({
				conflict: "successor_artifact_already_has_predecessor",
				successorArtifactId: successor.id,
				supersededArtifactId: superseded.id,
			});
		}
		if (
			cycleWouldForm(
				edges,
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
		yield* validateCurrentStoredArtifactLineage;
		const superseded = yield* requireArtifact(input.supersededArtifactId);
		const successor = yield* requireArtifact(input.successorArtifactId);
		yield* requireAuthority(input.actor, superseded, successor);
		yield* requireSharedPiece(superseded.id, successor.id);
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
