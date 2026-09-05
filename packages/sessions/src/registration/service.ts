import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { ensureRoot } from "#registration/ensure-root.ts";

export const SessionRegistration = defineService({
	id: "@antumbra/sessions/SessionRegistration",
	requires: [Database, DomainFeeds],
	initialize: Effect.void,
	methods: () => ({ ensureRoot }),
});
