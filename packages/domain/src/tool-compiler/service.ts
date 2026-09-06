import { Artifacts } from "@antumbra/artifacts";
import { Boards } from "@antumbra/boards";
import { Changes } from "@antumbra/changes";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Repos } from "@antumbra/repos";
import { Rulings } from "@antumbra/rulings";
import { RulingHolds } from "@antumbra/rulings/holds/service";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { RoleSettings } from "@antumbra/settings";
import { VoyageAuthority } from "@antumbra/voyages/authority/service";
import { BackendCatalog } from "#backend-catalog/service.ts";
import { CaptainMembership } from "#captain-membership.ts";
import { ExecutionSource } from "#execution/service.ts";
import { compile } from "#tool-compiler/compile.ts";
import { initialize } from "#tool-compiler/initialize.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

export const AgentToolCompiler = defineService({
	id: "@antumbra/domain/AgentToolCompiler",
	initialize: initialize,
	methods: (backends) => ({ compile: compile(backends) }),
	requires: [
		Artifacts,
		Boards,
		Changes,
		Pieces,
		Reports,
		Repos,
		Rulings,
		RulingHolds,
		RoleSettings,
		VoyageAuthority,
		BackendCatalog,
		CaptainMembership,
		ExecutionSource,
		VoyageDetails,
		VoyageProcedureService,
	],
});
