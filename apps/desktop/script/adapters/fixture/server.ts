import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Result, Schema } from "effect";
import { watch } from "rolldown";
import { fixtureBundle } from "#script/adapters/fixture/build.ts";

const Ready = Schema.fromJsonString(Schema.Struct({ port: Schema.Int }));

export const watchFixtureServer = async (directory: string, token: string) => {
	const bundle = await fixtureBundle(directory);
	const output = bundle.output.file;
	let child: ChildProcess | undefined;
	let port = 0;
	let failure: string | undefined;
	const observers = new Set<(failure: string | undefined) => void>();
	const report = (message: string | undefined) => {
		failure = message;
		for (const observer of observers) observer(failure);
	};
	let stopping = false;
	const stopChild = async () => {
		if (child !== undefined && child.exitCode === null && child.signalCode === null) {
			const exited = once(child, "exit");
			child.kill("SIGTERM");
			await exited;
		}
		child = undefined;
	};
	const startChild = async () => {
		await stopChild();
		child = spawn(
			process.execPath,
			[output, "--data", join(directory, "server"), "--files", directory, "--logs", directory, "--port", String(port)],
			{
				env: { ANTUMBRA_TOKEN: token },
				stdio: ["ignore", "pipe", "inherit"],
			},
		);
		const running = child;
		await new Promise<void>((resolve, reject) => {
			running.once("error", reject);
			running.once("exit", (code, signal) => {
				report(`Fixture server exited (${signal ?? code}); see viewer.log.`);
				reject(new Error(failure));
			});
			if (running.stdout !== null) {
				createInterface({ input: running.stdout }).on("line", (line) => {
					process.stdout.write(`${line}\n`);
					const ready = Schema.decodeUnknownResult(Ready)(line);
					if (Result.isSuccess(ready)) {
						port = ready.success.port;
						report(undefined);
						resolve();
					}
				});
			}
		});
	};
	const watcher = watch(bundle);
	let rebuild = Promise.resolve();
	let initial = true;
	const ready = new Promise<void>((resolve, reject) => {
		const completed = () => {
			initial = false;
			resolve();
		};
		const failed = (error: unknown) => {
			report(String(error));
			process.stderr.write(`${failure}\n`);
			if (initial) reject(error);
		};
		watcher.on("event", async (event) => {
			if (event.code === "BUNDLE_END") {
				await event.result.close();
				if (!stopping) rebuild = rebuild.then(startChild).then(completed).catch(failed);
			}
			if (event.code === "ERROR") {
				await event.result?.close();
				failed(event.error);
			}
		});
	});
	return {
		ready,
		get port() {
			return port;
		},
		get failure() {
			return failure;
		},
		subscribe: (observer: (failure: string | undefined) => void) => {
			observers.add(observer);
			return () => {
				observers.delete(observer);
			};
		},
		stop: async () => {
			stopping = true;
			await watcher.close();
			await rebuild;
			await stopChild();
		},
	};
};

export type FixtureServer = Awaited<ReturnType<typeof watchFixtureServer>>;
