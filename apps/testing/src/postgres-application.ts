import { artifacts } from "@antumbra/server-artifacts/handlers.ts";
import { backends } from "@antumbra/server-backends/handlers.ts";
import { boards } from "@antumbra/server-boards/handlers.ts";
import { changes } from "@antumbra/server-changes/handlers.ts";
import { inputs } from "@antumbra/server-inputs/handlers.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { mail } from "@antumbra/server-mail/handlers.ts";
import { pieces } from "@antumbra/server-pieces/handlers.ts";
import { reports } from "@antumbra/server-reports/handlers.ts";
import { repos } from "@antumbra/server-repos/handlers.ts";
import { roleSettings } from "@antumbra/server-role-settings/handlers.ts";
import { settings } from "@antumbra/server-settings/handlers.ts";
import { voyages } from "@antumbra/server-voyages/handlers.ts";
import { Layer } from "effect";
export const postgresApplication = Layer.mergeAll(
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
).pipe(
	Layer.provideMerge(
		Layer.mergeAll(
			BoardsHistory.layer,
			ReposHistory.layer,
			ArtifactsHistory.layer,
			ReportsHistory.layer,
			InputsHistory.layer,
			ChangesHistory.layer,
			VoyageHistory.layer,
			PieceHistory.layer,
			MailHistory.layer,
			SettingsHistory.layer,
			BackendsHistory.layer,
			RoleSettingsHistory.layer,
		),
	),
);
