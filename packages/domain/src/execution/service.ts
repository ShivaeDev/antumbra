import { Changes } from "@antumbra/changes";
import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/platform-service-definition/define-service.ts";
import { Rulings } from "@antumbra/rulings";
import { RoleSettings } from "@antumbra/settings";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { dispatch } from "#execution/dispatch.ts";
import { retirement } from "#execution/retirement.ts";
import { voyagePace } from "#execution/voyage-pace.ts";

export const ExecutionSource = defineService({
	id: "@antumbra/domain/ExecutionSource",
	initialize: Effect.void,
	methods: () => ({ dispatch, retirement, voyagePace }),
	requires: [Changes, Database, Pieces, Rulings, RoleSettings, SettingsSource, Voyages],
});
