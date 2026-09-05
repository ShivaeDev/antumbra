import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Console, Data, Deferred, Effect, FileSystem, Schedule } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { lock } from "proper-lockfile";

class TestLockError extends Data.TaggedError("TestLockError")<{ readonly cause: unknown }> {}

const isContended = (error: TestLockError): boolean => error.cause instanceof Error && "code" in error.cause && error.cause.code === "ELOCKED";

export const localTestLockPath = Effect.fnUntraced(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const fs = yield* FileSystem.FileSystem;
	const commonDirectory = yield* spawner.string(ChildProcess.make("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
	const canonical = yield* fs.realPath(commonDirectory.trim());
	return join(tmpdir(), `antumbra-tests-${createHash("sha256").update(canonical).digest("hex")}`);
}, Effect.scoped);

export const withTestLock = Effect.fnUntraced(function* <A, E, R>(body: Effect.Effect<A, E, R>, path: string) {
	const compromised = yield* Deferred.make<never, TestLockError>();
	const acquire = Effect.acquireRelease(
		Effect.tryPromise({
			try: () =>
				lock(path, {
					realpath: false,
					onCompromised: (cause) => Deferred.doneUnsafe(compromised, Effect.fail(new TestLockError({ cause }))),
				}),
			catch: (cause) => new TestLockError({ cause }),
		}),
		(release) => Effect.promise(() => release()),
	);
	yield* acquire.pipe(
		Effect.catchIf(isContended, () =>
			Console.log("Waiting for another local test run to finish...").pipe(
				Effect.andThen(acquire.pipe(Effect.retry({ while: isContended, schedule: Schedule.spaced("250 millis") }))),
			),
		),
	);
	return yield* Effect.raceFirst(body, Deferred.await(compromised));
}, Effect.scoped);
