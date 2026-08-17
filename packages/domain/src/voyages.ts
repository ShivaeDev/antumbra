import { Artifacts } from "@antumbra/artifacts";
import { Boards } from "@antumbra/boards";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Clock, Effect, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { hailCaptain } from "#hail.ts";
import type { OpenVoyageInput, VoyageProcedures } from "#voyage-procedures.ts";
import { readVoyageView } from "#voyage-read.ts";
import { requireVoyage } from "#voyage-record.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import { voyageSummaries } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export type { OpenVoyageInput, VoyageProcedures } from "#voyage-procedures.ts";

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

export const makeVoyageProcedures = Effect.gen(function* () {
	const artifacts = yield* Artifacts;
	const boards = yield* Boards;
	const pieces = yield* Pieces;
	const reports = yield* Reports;
	const world = yield* VoyageWorldSource;
	return (deps: AgentDeps): VoyageProcedures => ({
		charterPiece: pieces.charter,
		hail: (voyageId) =>
			hailCaptain(deps, voyageId).pipe(
				Effect.provideService(Boards, boards),
				Effect.provideService(VoyageWorldSource, world),
			),
		landArtifact: artifacts.land,
		landReport: reports.land,
		launch: pieces.launch,
		list: world.read.pipe(Effect.map(voyageSummaries)),
		open: (input) => openVoyage(deps, input),
		park: (pieceId) => pieces.park(pieceId, true),
		read: (voyageId) =>
			readVoyageView(voyageId).pipe(
				Effect.provideService(VoyageWorldSource, world),
			),
		// why: the public vocabulary keeps its established verb while the capability
		// names the exact act. Literal set-dependency semantics land separately.
		rewire: pieces.setDependencies,
		setFocus: (voyageId, focused) => setFocus(deps, voyageId, focused),
		unpark: (pieceId) => pieces.park(pieceId, false),
	});
});
