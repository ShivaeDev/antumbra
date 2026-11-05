import { allows } from "@antumbra/domain-settings/queries/flags.ts";
import { quietIds } from "@antumbra/domain-voyages/rows/voyage.ts";
import { wakeWords } from "@antumbra/platform-prompts/wake.ts";
import { LifecycleRefused } from "@antumbra/platform-runner/lifecycle.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Lifecycle } from "@antumbra/server-lifecycle/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Settings } from "@antumbra/server-settings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Clock, Effect } from "effect";

export const honorRestart = Effect.fn("Lifecycle.honorRestart")(function* ({ requestId }: { readonly requestId: string }) {
	const lifecycleService = yield* Lifecycle;
	const settingsService = yield* Settings;
	const voyagesService = yield* Voyages;
	const agentsService = yield* Agents;
	const sessionsService = yield* Sessions;

	const sessions = yield* lifecycleService.pending({}).pipe(Effect.orDie);
	if (sessions === null) return;
	if (!allows(yield* settingsService.flags({}).pipe(Effect.orDie), "wakeAfterRestart")) return;
	const quiet = quietIds(yield* voyagesService.list().pipe(Effect.orDie));
	const hushed = new Set(
		(yield* agentsService.roster({}).pipe(Effect.orDie))
			.filter((crew) => crew.voyageIds.some((sailed) => quiet.has(sailed)))
			.map((crew) => String(crew.id)),
	);
	const consumed = yield* lifecycleService.clear({ requestId: Request.make(requestId) }).pipe(
		Effect.as(true),
		Effect.catchTag("AlreadyDone", () => Effect.succeed(false)),
	);
	if (!consumed) return;
	const requestedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
	for (const sessionId of sessions) {
		const root = yield* sessionsService.reading({ id: sessionId }).pipe(Effect.orDie);
		if (root !== null && root.stoppedAt !== null) continue;
		if (root !== null && hushed.has(root.agentId)) continue;
		yield* sessionsService
			.request({
				requestId: Request.make(`${requestId}:${sessionId}`),
				sessionId,
				kind: "wake",
				inputId: null,
				reason: wakeWords,
				requestedAt,
			})
			.pipe(
				Effect.catchTag("AlreadyDone", () => Effect.void),
				Effect.mapError((failure) => new LifecycleRefused({ message: failure.message })),
			);
	}
});
