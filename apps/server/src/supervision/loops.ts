import { failLoop } from "@antumbra/domain-supervision/commands/loop-failed.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import type { Live } from "@antumbra/server-journal/live.ts";
import type { Loop } from "@antumbra/server-journal/loop.ts";
import type { Reconciler } from "@antumbra/server-journal/reconcile.ts";
import { Cause, Effect, Exit, Fiber, Scope, Stream } from "effect";
import { failureOf } from "#supervision/failure.ts";
import type { Loops } from "#supervision/handle.ts";
import { resuming } from "#supervision/resuming.ts";

const REFRESHING = "refreshing";
const RESUMING = "resuming";

const refreshing = (loops: Loops, wakes: Stream.Stream<unknown>) =>
	Effect.map(Effect.forkScoped(Stream.runForEach(wakes, () => loops.refresh)), (fiber) => ({
		refresh: Effect.void,
		await: Effect.asVoid(Fiber.join(fiber)),
	}));

interface Running {
	readonly refresh: Effect.Effect<void>;
	readonly scope: Scope.Closeable;
}

export const supervise = Effect.fn("Supervision.supervise")(function* <R>(loops: readonly Loop<R>[], wakes: Stream.Stream<unknown>) {
	const commit = yield* Commit;
	const lifetime = yield* Effect.scope;
	const context = yield* Effect.context<Commit | Live | R>();
	const declared = new Map<string, Effect.Effect<Reconciler, never, Commit | Live | R | Scope.Scope>>(
		loops.map((loop) => [loop.name, loop.open] as const),
	);
	const running = new Map<string, Running>();
	const stopped = Effect.fn("Supervision.stopped")(function* (name: string, scope: Scope.Closeable, awaiting: Effect.Effect<void>) {
		const exit = yield* Effect.exit(awaiting);
		running.delete(name);
		yield* Scope.close(scope, Exit.void);
		if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) return;
		yield* Effect.logError(`the ${name} loop stopped on an error`, exit.cause);
		const failure = failureOf(exit.cause);
		yield* commit
			.commit(failLoop, { loop: name, message: failure.message, requestId: Id.Request.make(Id.make()), trace: failure.trace })
			.pipe(Effect.catchCause((cause) => Effect.logError(`the ${name} loop stop went unrecorded`, cause)));
	});
	const opening = Effect.fn("Supervision.opening")(function* (name: string) {
		const open = declared.get(name);
		if (open === undefined || running.has(name)) return;
		const scope = yield* Scope.fork(lifetime);
		const loop = yield* open.pipe(Scope.provide(scope));
		running.set(name, { refresh: loop.refresh, scope });
		yield* stopped(name, scope, loop.await).pipe(Effect.forkIn(lifetime));
	});
	const handle: Loops = {
		refresh: Effect.suspend(() => Effect.forEach([...running.values()], (loop) => loop.refresh, { discard: true })),
		running: (name) => running.has(name),
		start: (name) => opening(name).pipe(Effect.provide(context)),
	};
	declared.set(REFRESHING, refreshing(handle, wakes));
	declared.set(RESUMING, resuming(handle));
	yield* Effect.forEach([...declared.keys()], (name) => handle.start(name), { discard: true });
	return handle;
});
