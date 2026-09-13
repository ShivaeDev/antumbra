import { fork } from "node:child_process";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Data, Effect, Option, Schema } from "effect";
import { lock } from "proper-lockfile";

export class FixtureViewerError extends Data.TaggedError("FixtureViewerError")<{ readonly cause: unknown }> {}

const Viewer = Schema.Struct({ url: Schema.String, token: Schema.String });
const Status = Schema.Struct({ token: Schema.String, failure: Schema.NullOr(Schema.String) });
const attempt = <A>(body: () => Promise<A>) => Effect.tryPromise({ try: body, catch: (cause) => new FixtureViewerError({ cause }) });
const missing = (cause: unknown, code: string): boolean => cause instanceof Error && "code" in cause && cause.code === code;
const descriptor = (root: string) => join(root, ".fixtures", "viewer.json");

const withOwnership = <A, E, R>(root: string, name: string, body: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		yield* attempt(() => mkdir(join(root, ".fixtures"), { recursive: true }));
		yield* Effect.acquireRelease(
			attempt(() => lock(join(root, ".fixtures", name), { realpath: false })),
			(release) => Effect.promise(release),
		);
		return yield* body;
	}).pipe(Effect.scoped);

export const withViewerOwnership = <A, E, R>(root: string, body: Effect.Effect<A, E, R>) => withOwnership(root, "viewer.json", body);
export const withCheckOwnership = <A, E, R>(root: string, body: Effect.Effect<A, E, R>) => withOwnership(root, "check", body);

const currentViewer = Effect.fnUntraced(function* (root: string) {
	const contents = yield* attempt(() => readFile(descriptor(root), "utf8")).pipe(
		Effect.catchIf(
			(error) => missing(error.cause, "ENOENT"),
			() => Effect.succeed(undefined),
		),
	);
	if (contents === undefined) return undefined;
	const viewer = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Viewer))(contents).pipe(
		Effect.mapError((cause) => new FixtureViewerError({ cause })),
	);
	const url = yield* Effect.try({ try: () => new URL(viewer.url), catch: (cause) => new FixtureViewerError({ cause }) });
	if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
		return yield* Effect.fail(new FixtureViewerError({ cause: "Fixture viewer descriptor must use loopback HTTP." }));
	}
	const response = yield* attempt(() =>
		fetch(new URL("/__fixture/status", url), { headers: { Authorization: `Bearer ${viewer.token}` }, signal: AbortSignal.timeout(5000) }),
	).pipe(
		Effect.catchIf(
			(error) => error.cause instanceof Error && missing(error.cause.cause, "ECONNREFUSED"),
			() => Effect.succeed(undefined),
		),
	);
	if (response === undefined || response.status === 401 || response.status === 403 || response.status === 404) return undefined;
	if (!response.ok) return yield* Effect.fail(new FixtureViewerError({ cause: `Fixture status returned HTTP ${response.status}.` }));
	const status = yield* attempt(() => response.json()).pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Status)),
		Effect.mapError((cause) => new FixtureViewerError({ cause })),
	);
	if (status.token !== viewer.token) return undefined;
	return { ...viewer, failure: status.failure };
});

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
		const child = yield* Effect.acquireRelease(
			Effect.sync(() =>
				fork(join(checkoutRoot, "apps/desktop/script/fixture.ts"), [workingRoot, manifest.label, manifest.captureCompletedAt], {
					cwd: join(checkoutRoot, "apps/desktop"),
					detached: true,
					stdio: ["ignore", log.fd, log.fd, "ipc"],
				}),
			),
			(child) =>
				Effect.promise(() => {
					if (!child.connected || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
					const exited = new Promise<void>((resolve) => child.once("close", () => resolve()));
					child.kill("SIGTERM");
					child.disconnect();
					return exited;
				}),
		);
		const viewer = yield* attempt(
			() =>
				new Promise<typeof Viewer.Type>((resolve, reject) => {
					const fail = (cause: unknown) => {
						reject(cause);
					};
					child.once("error", fail);
					child.once("exit", (code, signal) => fail(new Error(`Fixture viewer exited before readiness (${code ?? signal}).`)));
					child.once("message", (message) => {
						const ready = Schema.decodeUnknownOption(Viewer)(message);
						if (Option.isNone(ready)) return fail(new Error("Fixture viewer sent invalid readiness data."));
						child.removeAllListeners("exit");
						resolve(ready.value);
					});
				}),
		).pipe(
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

export const stopViewer = (checkoutRoot: string) =>
	Effect.gen(function* () {
		const viewer = yield* currentViewer(checkoutRoot);
		if (viewer) {
			const response = yield* attempt(() =>
				fetch(new URL("/__fixture/stop", viewer.url), {
					method: "POST",
					headers: { Authorization: `Bearer ${viewer.token}` },
					signal: AbortSignal.timeout(120000),
				}),
			);
			if (!response.ok) return yield* Effect.fail(new FixtureViewerError({ cause: `Fixture stop returned HTTP ${response.status}.` }));
		}
		yield* attempt(() => rm(descriptor(checkoutRoot), { force: true }));
	});

export const checkViewer = (checkoutRoot: string) =>
	Effect.gen(function* () {
		const child = yield* Effect.acquireRelease(
			Effect.sync(() =>
				fork(join(checkoutRoot, "apps/desktop/script/fixture.ts"), ["--check", join(checkoutRoot, ".fixtures", "check")], {
					cwd: join(checkoutRoot, "apps/desktop"),
					stdio: ["ignore", "pipe", "pipe", "ipc"],
				}),
			),
			(child) =>
				Effect.promise(() => {
					if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
					const exited = new Promise<void>((resolve) => child.once("close", () => resolve()));
					child.kill("SIGTERM");
					return exited;
				}),
		);
		yield* attempt(
			() =>
				new Promise<void>((resolve, reject) => {
					let output = "";
					const collect = (chunk: Buffer) => {
						output = (output + chunk.toString()).slice(-8000);
					};
					child.stdout?.on("data", collect);
					child.stderr?.on("data", collect);
					child.once("error", reject);
					child.once("close", (code, signal) => {
						if (code === 0) resolve();
						else reject(new Error(`Fixture check failed (${code ?? signal}).\n${output}`));
					});
				}),
		);
	}).pipe(Effect.scoped);
