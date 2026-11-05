import { Agents } from "@antumbra/server-agents/service.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { Boards } from "@antumbra/server-boards/service.ts";
import { Capacity } from "@antumbra/server-capacity/service.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { Costs } from "@antumbra/server-costs/service.ts";
import { Holds } from "@antumbra/server-holds/service.ts";
import { Inputs } from "@antumbra/server-inputs/service.ts";
import { Lifecycle } from "@antumbra/server-lifecycle/service.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Reclamation } from "@antumbra/server-reclamation/service.ts";
import { Reports } from "@antumbra/server-reports/service.ts";
import { Repos } from "@antumbra/server-repos/service.ts";
import { RoleSettings } from "@antumbra/server-role-settings/service.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Settings } from "@antumbra/server-settings/service.ts";
import { ArtifactsHistory } from "@antumbra/server-storage/artifacts/service.ts";
import { BackendsHistory } from "@antumbra/server-storage/backends/service.ts";
import { BoardsHistory } from "@antumbra/server-storage/boards/service.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { ReportsHistory } from "@antumbra/server-storage/reports/service.ts";
import { ReposHistory } from "@antumbra/server-storage/repos/service.ts";
import { RoleSettingsHistory } from "@antumbra/server-storage/role-settings/service.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { Supervision } from "@antumbra/server-supervision/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Layer } from "effect";
import { postgresDefinition } from "#postgres-definition.ts";

export const histories = Layer.mergeAll(
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
).pipe(Layer.provideMerge(postgresDefinition), Layer.provideMerge(Records.layer));

export const services = Layer.mergeAll(
	Sessions.layer,
	Agents.layer,
	Capacity.layer,
	Reclamation.layer,
	Rulings.layer,
	Lifecycle.layer,
	Supervision.layer,
	Costs.layer,
	Holds.layer,
	Changes.layer,
	Inputs.layer,
	Repos.layer,
	Artifacts.layer,
	Reports.layer,
	Boards.layer,
	Voyages.layer,
	Pieces.layer,
	Mail.layer,
	Settings.layer,
	Backends.layer,
	RoleSettings.layer,
).pipe(Layer.provideMerge(histories));
