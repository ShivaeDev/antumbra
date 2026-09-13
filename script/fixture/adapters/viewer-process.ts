import { fork } from "node:child_process";
import { open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect, Option, Schema } from "effect";
import { currentViewer, descriptor, FixtureViewerError, stopViewer, Viewer } from "#fixture/adapters/viewer-owner.ts";

const attempt = <A>(body: () => Promise<A>) => Effect.tryPromise({ try: body, catch: (cause) => new FixtureViewerError({ cause }) });

export const startViewer = (checkoutRoot: string, manifest: { readonly label: string; readonly captureCompletedAt: string }) =>
	Effect.gen(function* () {
		const current = yield* currentViewer(checkoutRoot);
		if (current) {
			if (current.failure === null) return current;
			yield* stopViewer(checkoutRoot);
		}
		const workingRoot = join(checkoutRoot, ".fixtures", "open");
		const logPath = join(workingRoot, "viewer.log");
		const log = yield* Effect.acquireRelease(
			attempt(() => open(logPath, "w")),
			(file) => Effect.promise(() => file.close()),
		);
		const { child, ready } = yield* Effect.acquireRelease(
			Effect.try({
				try: () => {
					const child = fork(join(checkoutRoot, "apps/desktop/script/fixture.ts"), [workingRoot, manifest.label, manifest.captureCompletedAt], {
						cwd: join(checkoutRoot, "apps/desktop"),
						detached: true,
						stdio: ["ignore", log.fd, log.fd, "ipc"],
					});
					const closed = new Promise<void>((resolve) =>
						child.once("close", () => {
							resolve();
						}),
					);
					const ready = new Promise<typeof Viewer.Type>((resolve, reject) => {
						child.once("error", (error) => {
							reject(error);
						});
						child.once("exit", (code, signal) => {
							reject(new Error(`Fixture viewer exited before readiness (${code ?? signal}).`));
						});
						child.once("message", (message) => {
							const ready = Schema.decodeUnknownOption(Viewer)(message);
							if (Option.isNone(ready)) return reject(new Error("Fixture viewer sent invalid readiness data."));
							resolve(ready.value);
						});
					});
					return { child, ready, closed };
				},
				catch: (cause) => new FixtureViewerError({ cause }),
			}),
			({ child, closed }) =>
				Effect.promise(() => {
					if (!child.connected || child.pid === undefined) return Promise.resolve();
					child.kill("SIGTERM");
					child.disconnect();
					return closed;
				}),
		);
		const viewer = yield* attempt(() => ready).pipe(
			Effect.catch((error) =>
				attempt(() => readFile(logPath, "utf8")).pipe(
					Effect.flatMap((log) => Effect.fail(new FixtureViewerError({ cause: `${String(error.cause)}\n${log.slice(-8000)}` }))),
				),
			),
		);
		yield* attempt(() => writeFile(descriptor(checkoutRoot), JSON.stringify(viewer), { mode: 0o600 }));
		yield* Effect.sync(() => {
			child.disconnect();
			child.unref();
		});
		return viewer;
	}).pipe(Effect.scoped);

export const checkViewer = (checkoutRoot: string) =>
	Effect.gen(function* () {
		const { completed } = yield* Effect.acquireRelease(
			Effect.try({
				try: () => {
					const child = fork(join(checkoutRoot, "apps/desktop/script/fixture.ts"), ["--check", join(checkoutRoot, ".fixtures", "check")], {
						cwd: join(checkoutRoot, "apps/desktop"),
						stdio: ["ignore", "pipe", "pipe", "ipc"],
					});
					const closed = new Promise<void>((resolve) =>
						child.once("close", () => {
							resolve();
						}),
					);
					const completed = new Promise<void>((resolve, reject) => {
						let output = "";
						const collect = (chunk: Buffer) => {
							output = (output + chunk.toString()).slice(-8000);
						};
						child.stdout?.on("data", collect);
						child.stderr?.on("data", collect);
						child.once("error", (error) => {
							reject(error);
						});
						child.once("close", (code, signal) => {
							if (code === 0) resolve();
							else reject(new Error(`Fixture check failed (${code ?? signal}).\n${output}`));
						});
					});
					return { child, completed, closed };
				},
				catch: (cause) => new FixtureViewerError({ cause }),
			}),
			({ child, closed }) =>
				Effect.promise(() => {
					if (child.pid === undefined) return Promise.resolve();
					if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
					return closed;
				}),
		);
		yield* attempt(() => completed);
	}).pipe(Effect.scoped);
