import { Artifacts } from "@antumbra/artifacts";
import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Rulings } from "@antumbra/rulings";
import type { AgentBackendTag } from "@antumbra/vocabulary/agent-backend";
import { Clock, Context, Effect, Layer } from "effect";
import { hailCaptain } from "#hail.ts";
import { KernelReach } from "#kernel-reach.ts";
import { workPieceNow } from "#piece-work.ts";
import { type OpenVoyageInput, VoyageProcedureService, type VoyageProcedures } from "#voyage-procedures.ts";
import { readVoyageView } from "#voyage-read.ts";
import { requireVoyage } from "#voyage-record.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import { voyageSummaries } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export type { OpenVoyageInput, VoyageProcedures } from "#voyage-procedures.ts";

const announce = DomainFeeds.pipe(Effect.flatMap((feeds) => feeds.publishVoyageRefresh()));

const openVoyage = (input: OpenVoyageInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const now = yield* Clock.currentTimeMillis;
		const row: VoyageRow = {
			captainBackend: input.backend,
			context: input.context,
			crewBackend: input.backend,
			focusedAt: input.focused === true ? new Date(now) : null,
			id: crypto.randomUUID(),
			kind: "voyage",
			name: input.name,
			northStar: input.northStar,
		};
		yield* db.Voyage.create(row);
		yield* announce;
		return row;
	});

const setCaptainBackend = (voyageId: string, backend: AgentBackendTag) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* requireVoyage(voyageId);
		yield* db.Voyage.where({ id: voyageId }).update({ captainBackend: backend });
		yield* announce;
	});

const setCrewBackend = (voyageId: string, backend: AgentBackendTag) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* requireVoyage(voyageId);
		yield* db.Voyage.where({ id: voyageId }).update({ crewBackend: backend });
		yield* announce;
	});

const setFocus = (voyageId: string, focused: boolean) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const now = yield* Clock.currentTimeMillis;
		yield* Effect.gen(function* () {
			yield* requireVoyage(voyageId);
			yield* db.Voyage.where({ id: voyageId }).update({
				focusedAt: focused ? new Date(now) : null,
			});
		});
		yield* announce;
	});

export const VoyageProceduresLive = Layer.effect(VoyageProcedureService)(
	Effect.gen(function* () {
		const artifacts = yield* Artifacts;
		const boards = yield* Boards;
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const reach = yield* KernelReach;
		const pieces = yield* Pieces;
		const reports = yield* Reports;
		const rulings = yield* Rulings;
		const world = yield* VoyageWorldSource;
		const context = Context.make(Boards, boards).pipe(
			Context.add(Database, db),
			Context.add(DomainFeeds, feeds),
			Context.add(KernelReach, reach),
			Context.add(Rulings, rulings),
			Context.add(VoyageWorldSource, world),
		);
		return VoyageProcedureService.of({
			artifactMarkdown: artifacts.readMarkdown,
			charterPiece: pieces.charter,
			hail: (voyageId) => Effect.provide(hailCaptain(voyageId), context),
			landArtifact: artifacts.land,
			landPieceVerdict: pieces.landVerdict,
			landReport: reports.land,
			readReport: reports.read,
			removeArtifactSupersession: (input) => artifacts.removeSupersession({ actor: { _tag: "admiral" }, ...input }),
			launch: pieces.launch,
			list: world.read.pipe(Effect.map(voyageSummaries)),
			open: (input) => Effect.provide(openVoyage(input), context),
			park: (pieceId) => pieces.park(pieceId, true),
			read: (voyageId) => readVoyageView(voyageId).pipe(Effect.provideService(VoyageWorldSource, world)),
			rewire: pieces.setDependencies,
			setCaptainBackend: (voyageId, backend) => Effect.provide(setCaptainBackend(voyageId, backend), context),
			setCrewBackend: (voyageId, backend) => Effect.provide(setCrewBackend(voyageId, backend), context),
			setFocus: (voyageId, focused) => Effect.provide(setFocus(voyageId, focused), context),
			supersedeArtifact: (input) => artifacts.supersede({ actor: { _tag: "admiral" }, ...input }),
			unpark: (pieceId) => pieces.park(pieceId, false),
			workNow: (pieceId) => Effect.provide(workPieceNow(pieceId), context),
		} satisfies VoyageProcedures);
	}),
);
