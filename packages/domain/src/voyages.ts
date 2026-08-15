import type { PrismaError } from "@antumbra/persistence";
import { Clock, Effect, type Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { EdgeWouldCycle, PieceNotFound, VoyageNotFound } from "#errors.ts";
import { type HailedCaptain, type HailRefused, hailCaptain } from "#hail.ts";
import {
	type ArtifactInput,
	landArtifact,
	landReport,
	type ReportInput,
} from "#outcomes.ts";
import {
	type CharterFailure,
	type CharterInput,
	charterPiece,
	launchPiece,
	parkPiece,
	rewirePiece,
} from "#pieces.ts";
import { readVoyageView } from "#voyage-read.ts";
import { requireVoyage } from "#voyage-record.ts";
import type {
	ArtifactRow,
	PieceRow,
	ReportRow,
	VoyageRow,
} from "#voyage-rows.ts";
import {
	type VoyageSummary,
	type VoyageView,
	voyageSummaries,
} from "#voyage-view.ts";
import { readVoyageWorld } from "#voyage-world.ts";

export interface OpenVoyageInput {
	readonly backend: string;
	readonly context: string;
	readonly focused?: boolean;
	readonly name: string;
	readonly northStar: string;
}

export interface VoyageProcedures {
	readonly charterPiece: (
		input: CharterInput,
	) => Effect.Effect<PieceRow, CharterFailure>;
	readonly hail: (
		voyageId: string,
	) => Effect.Effect<HailedCaptain, HailRefused>;
	readonly landArtifact: (
		input: ArtifactInput,
	) => Effect.Effect<ArtifactRow, PieceNotFound | PrismaError>;
	readonly landReport: (
		input: ReportInput,
	) => Effect.Effect<ReportRow, PieceNotFound | PrismaError>;
	readonly launch: (
		pieceId: string,
	) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly list: Effect.Effect<ReadonlyArray<VoyageSummary>, PrismaError>;
	readonly open: (
		input: OpenVoyageInput,
	) => Effect.Effect<VoyageRow, PrismaError>;
	readonly park: (
		pieceId: string,
	) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly read: (
		voyageId: string,
	) => Effect.Effect<Option.Option<VoyageView>, PrismaError>;
	readonly rewire: (
		pieceId: string,
		dependsOn: ReadonlyArray<string>,
	) => Effect.Effect<void, EdgeWouldCycle | PieceNotFound | PrismaError>;
	readonly setFocus: (
		voyageId: string,
		focused: boolean,
	) => Effect.Effect<void, PrismaError | VoyageNotFound>;
	readonly unpark: (
		pieceId: string,
	) => Effect.Effect<void, PieceNotFound | PrismaError>;
}

const announce = (deps: AgentDeps) =>
	PubSub.publish(deps.feeds.voyages, undefined);

const openVoyage = (deps: AgentDeps, input: OpenVoyageInput) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const row: VoyageRow = {
			backend: input.backend,
			context: input.context,
			focusedAt: input.focused === true ? new Date(now) : null,
			id: crypto.randomUUID(),
			name: input.name,
			northStar: input.northStar,
		};
		yield* provideExecutors(deps)(
			deps.writer.write(deps.db.Voyage.create(row)),
		);
		yield* announce(deps);
		return row;
	});

// why: focus is a stamped moment rather than a flag so the dispatcher can
// order by it later without a second column, and so un-focusing leaves no
// trace to mistake for history.
const setFocus = (deps: AgentDeps, voyageId: string, focused: boolean) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					yield* requireVoyage(deps.db, voyageId);
					yield* deps.db.Voyage.where({ id: voyageId }).update({
						focusedAt: focused ? new Date(now) : null,
					});
				}),
			),
		);
		yield* announce(deps);
	});

export const makeVoyageProcedures = (deps: AgentDeps): VoyageProcedures => ({
	charterPiece: (input) => charterPiece(deps, input),
	hail: (voyageId) => hailCaptain(deps, voyageId),
	landArtifact: (input) => landArtifact(deps, input),
	landReport: (input) => landReport(deps, input),
	launch: (pieceId) => launchPiece(deps, pieceId),
	list: readVoyageWorld(deps).pipe(Effect.map(voyageSummaries)),
	open: (input) => openVoyage(deps, input),
	park: (pieceId) => parkPiece(deps, pieceId, true),
	read: (voyageId) => readVoyageView(deps, voyageId),
	rewire: (pieceId, dependsOn) => rewirePiece(deps, pieceId, dependsOn),
	setFocus: (voyageId, focused) => setFocus(deps, voyageId, focused),
	unpark: (pieceId) => parkPiece(deps, pieceId, false),
});
