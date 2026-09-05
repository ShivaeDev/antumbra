import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { RecoveryOptions } from "#recovery/options.ts";
import { resumeSession } from "#recovery/resume.ts";

export const SessionRecoveryRuntime = defineService({
	id: "@antumbra/sessions/SessionRecoveryRuntime",
	initialize: Effect.void,
	methods: () => ({ resume: resumeSession }),
	requires: [Database, SessionFabric, RecoveryOptions],
});
