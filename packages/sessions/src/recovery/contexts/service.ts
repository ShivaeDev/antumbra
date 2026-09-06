import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { CurrentSessions } from "#current/service.ts";
import { load } from "#recovery/contexts/load.ts";

export const SessionRecoveryContexts = defineService({
	id: "@antumbra/sessions/SessionRecoveryContexts",
	initialize: Effect.void,
	methods: () => ({ load }),
	requires: [Database, CurrentSessions],
});
