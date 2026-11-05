import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { claim } from "#commands/claim.ts";
import { failed } from "#commands/failed.ts";
import { held } from "#commands/held.ts";
import { plan } from "#commands/plan.ts";
import { ready } from "#commands/ready.ts";
import { reclaimed } from "#commands/reclaimed.ts";
import { berths } from "#queries/berths.ts";
import { candidates } from "#queries/candidates.ts";
import { claims } from "#queries/claims.ts";
import { current } from "#queries/current.ts";
import { retryable } from "#queries/retryable.ts";
export const Reclamation = defineService({
	id: "@antumbra/server-reclamation/Reclamation",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ plan, ready, claim, reclaimed, held, failed, berths, current, candidates, claims, retryable }),
});
