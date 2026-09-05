import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { hailCaptain } from "#hail.ts";
import { KernelReach } from "#kernel-reach.ts";
import { workPieceNow } from "#piece-work/work.ts";
import { readVoyageView } from "#voyage-read.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";
import { list } from "#voyages/list.ts";
import { openVoyage } from "#voyages/open.ts";
import { setAgentSettings } from "#voyages/set-agent-settings.ts";
import { setCaptainBackend } from "#voyages/set-captain-backend.ts";
import { setCrewBackend } from "#voyages/set-crew-backend.ts";
import { setFocus } from "#voyages/set-focus.ts";

export const VoyageProcedureService = defineService({
	id: "@antumbra/domain/VoyageProcedures",
	requires: [Boards, Database, DomainFeeds, KernelReach, Pieces, Rulings, VoyageWorldSource],
	initialize: Effect.void,
	methods: () => ({
		hail: hailCaptain,
		list,
		open: openVoyage,
		read: readVoyageView,
		setAgentSettings,
		setCaptainBackend,
		setCrewBackend,
		setFocus,
		workNow: workPieceNow,
	}),
});
export type VoyageProcedures = Context.Service.Shape<typeof VoyageProcedureService>;
