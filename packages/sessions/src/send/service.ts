import { Database } from "@antumbra/persistence";
import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionInputs } from "@antumbra/session-inputs";
import { CurrentSessions } from "#current/service.ts";
import { SessionInputDelivery } from "#input-delivery/service.ts";
import { SessionReach } from "#reach.ts";
import { initialize } from "#send/initialize.ts";
import { sendInput } from "#send/input.ts";
import { SessionSendOptions } from "#send/options.ts";
import { sendPrompt } from "#send/prompt.ts";

export const SessionSend = defineService({
	id: "@antumbra/sessions/SessionSend",
	initialize: initialize,
	methods: (scope) => ({ sendInput: sendInput(scope), sendPrompt: sendPrompt(scope) }),
	requires: [Database, CurrentSessions, BackendCapacities, SessionFabric, SessionInputs, SessionInputDelivery, SessionReach, SessionSendOptions],
});
