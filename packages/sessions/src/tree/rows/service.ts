import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { adoptNode } from "#tree/rows/adopt-node.ts";
import { closeNode } from "#tree/rows/close-node.ts";
import { markIncomplete } from "#tree/rows/mark-incomplete.ts";
import { nameNode } from "#tree/rows/name-node.ts";
import { openNode } from "#tree/rows/open-node.ts";
import { rootRow } from "#tree/rows/root-row.ts";

export const SessionTreeRows = defineService({
	id: "@antumbra/sessions/SessionTreeRows",
	initialize: Effect.void,
	methods: () => ({ openNode, closeNode, adoptNode, nameNode, markIncomplete, rootRow }),
	requires: [Database],
});
