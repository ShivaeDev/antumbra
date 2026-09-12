import { dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Effect, Fiber, Stream } from "effect";
import { deliver } from "#mail/deliver.ts";

const PATIENCE_MILLIS = 5_000;

export const reconcile = Effect.fn("Mail.reconcile")(function* () {
	const live = yield* Live;
	const work = yield* run(dueWakes, {}, deliver);
	const timer = yield* Effect.forkScoped(Effect.forever(Effect.sleep(PATIENCE_MILLIS).pipe(Effect.andThen(work.refresh))));
	const settings = yield* Effect.forkScoped(Stream.runForEach(live.live(flags, {}), () => work.refresh));
	return { refresh: work.refresh, await: Effect.raceAllFirst([work.await, Fiber.join(timer), Fiber.join(settings)]) };
});
