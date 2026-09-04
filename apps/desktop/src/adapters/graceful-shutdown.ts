import { Effect, type ManagedRuntime, Ref } from "effect";

interface QuitRequest {
	readonly preventDefault: () => void;
}

interface QuitApplication {
	readonly onBeforeQuit: (listener: (event: QuitRequest) => void) => void;
	readonly quit: () => void;
	readonly relaunch: () => void;
}

type ShutdownPhase = "accepting" | "draining" | "exiting";

const allowShutdownRetry = (cause: unknown, allow: () => void) =>
	Effect.logError("graceful shutdown failed", cause).pipe(Effect.andThen(Effect.sync(allow)));

const permitFinalExit = (application: QuitApplication, restarting: Ref.Ref<boolean>, permit: () => void) =>
	Effect.map(Ref.get(restarting), (restart) => {
		permit();
		if (restart) {
			application.relaunch();
			return;
		}
		application.quit();
	});

export const drainManagedRuntime = <R, ER, E>(runtime: ManagedRuntime.ManagedRuntime<R, ER>, drain: Effect.Effect<void, E, R>) =>
	Effect.tryPromise({
		catch: (cause) => cause,
		try: () => runtime.runPromise(drain).then(() => runtime.dispose()),
	});

export const registerGracefulShutdown = <E>(application: QuitApplication, shutdown: Effect.Effect<void, E>, restarting: Ref.Ref<boolean>) =>
	Effect.sync(() => {
		let phase: ShutdownPhase = "accepting";
		application.onBeforeQuit((event) => {
			if (phase === "exiting") {
				return;
			}
			event.preventDefault();
			if (phase === "draining") {
				return;
			}
			phase = "draining";
			shutdown.pipe(
				Effect.matchCauseEffect({
					onFailure: (cause) =>
						allowShutdownRetry(cause, () => {
							phase = "accepting";
						}).pipe(Effect.andThen(Ref.set(restarting, false))),
					onSuccess: () =>
						permitFinalExit(application, restarting, () => {
							phase = "exiting";
						}),
				}),
				Effect.runFork,
			);
		});
	});
