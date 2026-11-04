import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { admit } from "#commands/admit.ts";
import { cancel } from "#commands/cancel.ts";
import { delay } from "#commands/delay.ts";
import { hail } from "#commands/hail.ts";
import { hold } from "#commands/hold.ts";
import { request } from "#commands/request.ts";
import { retire } from "#commands/retire.ts";
import { retireCrew } from "#commands/retire-crew.ts";
import { retry } from "#commands/retry.ts";
import { smooth } from "#commands/smooth.ts";
import { spawn } from "#commands/spawn.ts";
import { workNow } from "#commands/work-now.ts";
import { admitted } from "#queries/admitted.ts";
import { all } from "#queries/all.ts";
import { authority } from "#queries/authority.ts";
import { birthBySession } from "#queries/birth-by-session.ts";
import { births } from "#queries/births.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { bySession } from "#queries/by-session.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { canRetireCrew } from "#queries/can-retire-crew.ts";
import { captain } from "#queries/captain.ts";
import { captainReading } from "#queries/captain-reading.ts";
import { dispatch } from "#queries/dispatch.ts";
import { pending } from "#queries/pending.ts";
import { pendingOperations } from "#queries/pending-operations.ts";
import { reading } from "#queries/reading.ts";
import { rest } from "#queries/rest.ts";
import { roster } from "#queries/roster.ts";
import { smoother } from "#queries/smoother.ts";
import { workingCount } from "#queries/working-count.ts";
export const Agents = defineService({
	id: "@antumbra/server-agents/Agents",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({
		retireCrew,
		retire,
		spawn,
		hail,
		workNow,
		request,
		admit,
		hold,
		delay,
		cancel,
		retry,
		smooth,
		canRetireCrew,
		smoother,
		captainReading,
		byVoyage,
		byPiece,
		rest,
		roster,
		reading,
		bySession,
		workingCount,
		all,
		byId,
		captain,
		authority,
		births,
		birthBySession,
		dispatch,
		pending,
		pendingOperations,
		admitted,
	}),
});
