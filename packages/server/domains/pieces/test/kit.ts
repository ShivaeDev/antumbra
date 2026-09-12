import { voyages } from "@antumbra/domain-voyages/feature.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { testing } from "@antumbra/server-journal/testing/entry.ts";
import type { TestApp } from "@antumbra/server-journal/testing/surface.ts";
import { Effect, Option, Stream } from "effect";
import { pieces } from "#feature.ts";
import { PieceId } from "#ids.ts";

export const it = testing([pieces, voyages]);

export type Chart = TestApp<readonly [typeof pieces, typeof voyages]>;

const REEF = Id.Request.make("voyage:reef");

export const reef = VoyageId.make(REEF);

export const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "the reef is uncharted",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	requestId: REEF,
} as const;

export const pieceOf = (name: string): PieceId => PieceId.make(`piece:${name}`);

export const chartering = (name: string, dependsOn: readonly string[] = []) => ({
	charter: `sound ${name}`,
	dependsOn,
	expectation: `${name} is landed`,
	requestId: Id.Request.make(`piece:${name}`),
	role: "hand",
	title: name,
	voyageId: reef,
});

export const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);
