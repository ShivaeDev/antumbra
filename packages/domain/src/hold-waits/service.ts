import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { ExecutionSource } from "#execution/service.ts";
import { read } from "#hold-waits/read.ts";
import { MailDelivery } from "#mail-delivery/service.ts";

export const HoldWaits = defineService({
	id: "@antumbra/domain/HoldWaits",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Database, ExecutionSource, MailDelivery],
});
