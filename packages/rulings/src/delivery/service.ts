import { Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { deliverPending } from "#delivery/deliver-pending.ts";
import { RulingHolds } from "#holds/service.ts";
import { Rulings } from "#rulings.ts";

export const RulingDelivery = defineService({
	id: "@antumbra/rulings/RulingDelivery",
	initialize: Effect.void,
	methods: () => ({ deliverPending }),
	requires: [Database, Boards, RulingHolds, Rulings],
});
