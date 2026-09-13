import { Commit } from "@antumbra/server-journal/commit.ts";
import type { Live } from "@antumbra/server-journal/live.ts";
import type { Loop } from "@antumbra/server-journal/loop.ts";
import type { Reconciler } from "@antumbra/server-journal/reconcile.ts";
import { Cause, Effect, Exit, Fiber, Scope, Stream } from "effect";
import { forgetRunning } from "#supervision/forget.ts";
import type { Loops } from "#supervision/handle.ts";
import { recordDefect, recordEnd } from "#supervision/record.ts";
import { resuming } from "#supervision/resuming.ts";

const REFRESHING = "refreshing";
const RESUMING = "resuming";

const refreshing = (loops: Loops, wakes: Stream.Stream<unknown>) =>
	Effect.map(Effect.forkScoped(Stream.runForEach(wakes, () => loops.refresh)), (fiber) => ({
		refresh: Effect.void,
		await: Effect.asVoid(Fiber.join(fiber)),
	}));

const twiceNamed = (names: readonly string[]): string | undefined => {
	const seen = new Set<string>();
	for (const name of names) {
		if (seen.has(name)) return name;
		seen.add(name);
	}
	return undefined;
};

interface Running {
	readonly refresh: Effect.Effect<void>;
	readonly scope: Scope.Closeable;
}

export const supervise = Effect.fn("Supervision.supervise")(function* <R>(loops: readonly Loop<R>[], wakes: Stream.Stream<unknown>) {
	const twice = twiceNamed([...loops.map((loop) => loop.name), REFRESHING, RESUMING]);
	if (twice !== undefined) return yield* Effect.die(new Error(`two server loops are named ${twice}`));
	const commit = yield* Commit;
	const lifetime = yield* Effect.scope;
	const context = yield* Effect.context<Commit | Live | R>();
	type Opening = Effect.Effect<Reconciler, never, Commit | Live | R | Scope.Scope>;
	const declared = new Map<string, Opening>(loops.map((loop) => [loop.name, loop.open] as const));
	const running = new Map<string, Running>();
	const settling = new Set<string>();
	const claim = (name: string): boolean => {
		if (running.has(name) || settling.has(name)) return false;
		settling.add(name);
		return true;
	};
	const release = (name: string) => Effect.sync(() => settling.delete(name));
	const stopped = Effect.fn("Supervision.stopped")(function* (name: string, scope: Scope.Closeable, awaiting: Effect.Effect<void>) {
		const exit = yield* Effect.exit(awaiting);
		settling.add(name);
		running.delete(name);
		yield* Scope.close(scope, Exit.void);
		if (Exit.isSuccess(exit)) return yield* recordEnd(commit, name);
		if (Cause.hasInterruptsOnly(exit.cause)) return;
		yield* recordDefect(commit, name, exit.cause);
	});
	const watching = (name: string, scope: Scope.Closeable, awaiting: Effect.Effect<void>) =>
		stopped(name, scope, awaiting).pipe(
			Effect.ensuring(release(name)),
			Effect.catchCause((cause) => Effect.logError(`the ${name} loop record was lost`, cause)),
		);
	const forking = Effect.fn("Supervision.forking")(function* (name: string, open: Opening) {
		const scope = yield* Scope.fork(lifetime);
		const exit = yield* Effect.exit(open.pipe(Scope.provide(scope)));
		if (Exit.isSuccess(exit)) {
			running.set(name, { refresh: exit.value.refresh, scope });
			return yield* Effect.forkIn(watching(name, scope, exit.value.await), lifetime);
		}
		yield* Scope.close(scope, Exit.void);
		if (Cause.hasInterruptsOnly(exit.cause)) return;
		yield* recordDefect(commit, name, exit.cause);
	});
	const opening = (name: string) =>
		Effect.suspend(() => {
			const open = declared.get(name);
			if (open === undefined || !claim(name)) return Effect.void;
			return Effect.asVoid(Effect.ensuring(forking(name, open), release(name)));
		});
	const handle: Loops = {
		refresh: Effect.suspend(() => Effect.forEach([...running.values()], (loop) => loop.refresh, { discard: true })),
		running: (name) => running.has(name),
		start: (name) => opening(name).pipe(Effect.provide(context)),
	};
	declared.set(REFRESHING, refreshing(handle, wakes));
	declared.set(RESUMING, resuming(handle));
	yield* Effect.forEach([...declared.keys()], (name) => handle.start(name), { discard: true });
	yield* forgetRunning(handle);
	return handle;
});
