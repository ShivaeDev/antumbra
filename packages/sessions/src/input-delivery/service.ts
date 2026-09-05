import { defineService } from "@antumbra/service-definition";
import { SessionInputs } from "@antumbra/session-inputs";
import { Effect } from "effect";
import { carried } from "#input-delivery/carried.ts";
import { load } from "#input-delivery/load.ts";

export const SessionInputDelivery = defineService({
	id: "@antumbra/sessions/SessionInputDelivery",
	initialize: Effect.void,
	methods: () => ({ carried, load }),
	requires: [SessionInputs],
});
