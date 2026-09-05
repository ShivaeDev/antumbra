import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { abandon } from "#restart/abandon.ts";
import { consume } from "#restart/consume.ts";
import { record } from "#restart/record.ts";

export const SessionRestart = defineService({
	id: "@antumbra/sessions/SessionRestart",
	requires: [Database, SessionFabric],
	initialize: Effect.void,
	methods: () => ({ record, abandon, consume }),
});
