import { Artifacts } from "@antumbra/artifacts";
import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import type { AgentBackendTag } from "@antumbra/vocabulary/agent-backend";
import { Clock, Context, Effect, Layer } from "effect";
import { hailCaptain } from "#hail.ts";
import { KernelReach } from "#kernel-reach.ts";
import { workPieceNow } from "#piece-work.ts";
import {
	type OpenVoyageInput,
	VoyageProcedureService,
	type VoyageProcedures,
} from "#voyage-procedures.ts";
import { readVoyageView } from "#voyage-read.ts";
import { requireVoyage } from "#voyage-record.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import { voyageSummaries } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export type { OpenVoyageInput, VoyageProcedures } from "#voyage-procedures.ts";

const announce = DomainFeeds.pipe(
	Effect.flatMap((feeds) => feeds.publishVoyageRefresh()),
);

const openVoyage = (input: OpenVoyageInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		const row: VoyageRow = {
			backend: input.backend,
			context: input.context,
			focusedAt: input.focused === true ? new Date(now) : null,
			id: crypto.randomUUID(),
			name: input.name,
			northStar: input.northStar,
		};
		yield* writer.write(db.Voyage.create(row));
		yield* announce;
		return row;
	});

// why: the spawn paths read this column at the moment they spawn, so a switch
// retargets what the voyage does next and never what is already running — an
// agent's backend is written onto its own session row at its birth.
const setBackend = (voyageId: string, backend: AgentBackendTag) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.gen(function* () {
				yield* requireVoyage(voyageId);
				yield* db.Voyage.where({ id: voyageId }).update({ backend });
			}),
		);
		yield* announce;
	});

// why: focus is a stamped moment rather than a flag so the dispatcher can
// order by it later without a second column, and so un-focusing leaves no
// trace to mistake for history.
const setFocus = (voyageId: string, focused: boolean) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		yield* writer.write(
			Effect.gen(function* () {
				yield* requireVoyage(voyageId);
				yield* db.Voyage.where({ id: voyageId }).update({
					focusedAt: focused ? new Date(now) : null,
				});
			}),
		);
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
		const world = yield* VoyageWorldSource;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Boards, boards).pipe(
				Context.add(Database, db),
				Context.add(DomainFeeds, feeds),
				Context.add(KernelReach, reach),
				Context.add(VoyageWorldSource, world),
				Context.add(Writer, writer),
			),
		);
		return VoyageProcedureService.of({
			artifactMarkdown: artifacts.readMarkdown,
			charterPiece: pieces.charter,
			hail: (voyageId) => Effect.provide(hailCaptain(voyageId), context),
			landArtifact: artifacts.land,
			landPieceVerdict: pieces.landVerdict,
			landReport: reports.land,
			readReport: reports.read,
			removeArtifactSupersession: (input) =>
				artifacts.removeSupersession({ actor: { _tag: "admiral" }, ...input }),
			launch: pieces.launch,
			list: world.read.pipe(Effect.map(voyageSummaries)),
			open: (input) => Effect.provide(openVoyage(input), context),
			park: (pieceId) => pieces.park(pieceId, true),
			read: (voyageId) =>
				readVoyageView(voyageId).pipe(
					Effect.provideService(VoyageWorldSource, world),
				),
			// why: the public vocabulary keeps its established verb while the
			// capability names the exact act. Literal set-dependency semantics land
			// separately.
			rewire: pieces.setDependencies,
			setBackend: (voyageId, backend) =>
				Effect.provide(setBackend(voyageId, backend), context),
			setFocus: (voyageId, focused) =>
				Effect.provide(setFocus(voyageId, focused), context),
			supersedeArtifact: (input) =>
				artifacts.supersede({ actor: { _tag: "admiral" }, ...input }),
			unpark: (pieceId) => pieces.park(pieceId, false),
			workNow: (pieceId) => Effect.provide(workPieceNow(pieceId), context),
		} satisfies VoyageProcedures);
	}),
);
