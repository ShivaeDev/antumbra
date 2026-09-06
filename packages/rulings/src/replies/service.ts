import { Boards } from "@antumbra/boards";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { RulingHolds } from "#holds/service.ts";
import { askMore } from "#replies/ask-more.ts";
import { park } from "#replies/park.ts";
import { Rulings } from "#rulings.ts";

export const RulingReplies = defineService({
	id: "@antumbra/rulings/RulingReplies",
	initialize: Effect.void,
	methods: () => ({ askMore, park }),
	requires: [Boards, RulingHolds, Rulings],
});
