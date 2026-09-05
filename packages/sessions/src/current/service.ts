import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { reconcile } from "#current/reconcile.ts";
import { resumable } from "#current/resumable.ts";
import { awaken } from "#current/wake.ts";

export const CurrentSessions = defineService({
	id: "@antumbra/sessions/CurrentSessions",
	initialize: Effect.void,
	methods: () => ({ awaken, reconcile, resumable }),
	requires: [Database, SessionFabric, DomainFeeds],
});
