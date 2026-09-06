import { Boards } from "@antumbra/boards";
import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { KernelReach } from "#kernel-reach/service.ts";
import { deliver } from "#mail-delivery/deliver.ts";
import { dueWakes } from "#mail-delivery/due-wakes.ts";

export const MailDelivery = defineService({
	id: "@antumbra/domain/MailDelivery",
	initialize: Effect.void,
	methods: () => ({ deliver, dueWakes }),
	requires: [Boards, Database, SettingsSource, KernelReach],
});
