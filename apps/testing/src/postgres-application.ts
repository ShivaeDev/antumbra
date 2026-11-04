import { postgresDefinition } from "@antumbra/server/postgres-definition.ts";
import { postgresTranscripts } from "@antumbra/server/transcript/postgres.ts";
import { agents } from "@antumbra/server-agents/handlers.ts";
import { artifacts } from "@antumbra/server-artifacts/handlers.ts";
import { backends } from "@antumbra/server-backends/handlers.ts";
import { boards } from "@antumbra/server-boards/handlers.ts";
import { capacity } from "@antumbra/server-capacity/handlers.ts";
import { changes } from "@antumbra/server-changes/handlers.ts";
import { costs } from "@antumbra/server-costs/handlers.ts";
import { holds } from "@antumbra/server-holds/handlers.ts";
import { inputs } from "@antumbra/server-inputs/handlers.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { lifecycle } from "@antumbra/server-lifecycle/handlers.ts";
import { mail } from "@antumbra/server-mail/handlers.ts";
import { pieces } from "@antumbra/server-pieces/handlers.ts";
import { reclamation } from "@antumbra/server-reclamation/handlers.ts";
import { reports } from "@antumbra/server-reports/handlers.ts";
import { repos } from "@antumbra/server-repos/handlers.ts";
import { roleSettings } from "@antumbra/server-role-settings/handlers.ts";
import { rulings } from "@antumbra/server-rulings/handlers.ts";
import { sessions } from "@antumbra/server-sessions/handlers.ts";
import { settings } from "@antumbra/server-settings/handlers.ts";
import { supervision } from "@antumbra/server-supervision/handlers.ts";
import { voyages } from "@antumbra/server-voyages/handlers.ts";
import { Layer } from "effect";
export const postgresApplication = Layer.mergeAll(
	postgresTranscripts,
	sessions,
	agents,
	capacity,
	reclamation,
	rulings,
	lifecycle,
	supervision,
	costs,
	holds,
	changes,
	inputs,
	repos,
	artifacts,
	reports,
	boards,
	voyages,
	pieces,
	mail,
	settings,
	backends,
	roleSettings,
)
	.pipe(
		Layer.provideMerge(
			Layer.mergeAll(
				ExecutionHistory.layer.pipe(Layer.provide(postgresDefinition)),
				BoardsHistory.layer,
				ReposHistory.layer,
				ArtifactsHistory.layer,
				ReportsHistory.layer,
				InputsHistory.layer.pipe(Layer.provide(ExecutionHistory.layer)),
				ChangesHistory.layer,
				VoyageHistory.layer,
				PieceHistory.layer,
				MailHistory.layer,
				SettingsHistory.layer,
				BackendsHistory.layer,
				RoleSettingsHistory.layer,
			),
		),
	)
	.pipe(Layer.provideMerge(postgresDefinition));
