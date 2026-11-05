import { handlers as agents } from "@antumbra/server-agents/handlers.ts";
import { handlers as artifacts } from "@antumbra/server-artifacts/handlers.ts";
import { handlers as backends } from "@antumbra/server-backends/handlers.ts";
import { handlers as boards } from "@antumbra/server-boards/handlers.ts";
import { handlers as capacity } from "@antumbra/server-capacity/handlers.ts";
import { handlers as changes } from "@antumbra/server-changes/handlers.ts";
import { handlers as costs } from "@antumbra/server-costs/handlers.ts";
import { handlers as holds } from "@antumbra/server-holds/handlers.ts";
import { handlers as inputs } from "@antumbra/server-inputs/handlers.ts";
import { handlers as lifecycle } from "@antumbra/server-lifecycle/handlers.ts";
import { handlers as mail } from "@antumbra/server-mail/handlers.ts";
import { handlers as pieces } from "@antumbra/server-pieces/handlers.ts";
import { handlers as reclamation } from "@antumbra/server-reclamation/handlers.ts";
import { handlers as reports } from "@antumbra/server-reports/handlers.ts";
import { handlers as repos } from "@antumbra/server-repos/handlers.ts";
import { handlers as role_settings } from "@antumbra/server-role-settings/handlers.ts";
import { handlers as rulings } from "@antumbra/server-rulings/handlers.ts";
import { handlers as sessions } from "@antumbra/server-sessions/handlers.ts";
import { handlers as settings } from "@antumbra/server-settings/handlers.ts";
import { handlers as supervision } from "@antumbra/server-supervision/handlers.ts";
import { handlers as voyages } from "@antumbra/server-voyages/handlers.ts";
import { Layer } from "effect";
export const handlers = Layer.mergeAll(
	agents,
	artifacts,
	backends,
	boards,
	capacity,
	changes,
	costs,
	holds,
	inputs,
	lifecycle,
	mail,
	pieces,
	reclamation,
	reports,
	repos,
	role_settings,
	rulings,
	sessions,
	settings,
	supervision,
	voyages,
);
