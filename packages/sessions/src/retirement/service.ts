import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { closeOpen } from "#retirement/close-open.ts";
import { ensureRetirable } from "#retirement/ensure-retirable.ts";
import { stopRoots } from "#retirement/stop-roots.ts";

export const SessionRetirement = defineService({
	id: "@antumbra/sessions/SessionRetirement",
	requires: [Database, SessionFabric],
	initialize: Effect.void,
	methods: () => ({ ensureRetirable, stopRoots, closeOpen }),
});
