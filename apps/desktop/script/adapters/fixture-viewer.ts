import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer as createHttpServer, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { DraftRef } from "@antumbra/platform-shell/bridge.ts";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { Effect, ManagedRuntime, Result, Schema } from "effect";
import { build, watch } from "rolldown";
import { type Connect, createServer } from "vite";
import { ShellDrafts, ShellDraftsLayer } from "#adapters/drafts.ts";

const Arguments = Schema.Tuple([Schema.String, Schema.String, Schema.String]);
const Ready = Schema.fromJsonString(Schema.Struct({ port: Schema.Int }));
const Write = Schema.Struct({ ...DraftRef.fields, text: Schema.String });
const Clear = Schema.Struct({ ...DraftRef.fields, revision: Schema.String });

const check = async (directory: string) => {
	const output = join(directory, ".build", "server.mjs");
	await mkdir(dirname(output), { recursive: true });
	await build({
		input: fileURLToPath(import.meta.resolve("@antumbra/server/fixture-main.ts")),
		external: ["sharp"],
		platform: "node",
		output: { codeSplitting: false, file: output, format: "esm", paths: { sharp: fileURLToPath(import.meta.resolve("sharp")) } },
	});
	const child = spawn(process.execPath, [output, "--check", "--data", join(directory, "server"), "--files", directory, "--logs", directory], {
		stdio: "inherit",
		env: { ANTUMBRA_TOKEN: crypto.randomUUID() },
	});
	const stop = () => {
		child.kill("SIGTERM");
	};
	process.once("SIGTERM", stop);
	try {
		const [code] = await once(child, "exit");
		process.exitCode = Schema.decodeUnknownSync(Schema.Int)(code ?? 1);
	} finally {
		process.removeListener("SIGTERM", stop);
	}
};

const serve = async () => {
	if (process.argv[2] === "--check") {
		await check(Schema.decodeUnknownSync(Schema.String)(process.argv[3]));
		return;
	}
	const [directory, label, captureCompletedAt] = Schema.decodeUnknownSync(Arguments)(process.argv.slice(2));
	const desktop = dirname(dirname(import.meta.dirname));
	const output = join(directory, ".build", "server.mjs");
	await mkdir(dirname(output), { recursive: true });
	const token = crypto.randomUUID();
	const drafts = ManagedRuntime.make(ShellDraftsLayer(directory));
	let child: ChildProcess | undefined;
	let port = 0;
	let failure: string | undefined;
	const observers = new Set<ServerResponse>();
	const report = (message: string | undefined) => {
		failure = message;
		for (const response of observers) response.write(`data: ${JSON.stringify({ failure: failure ?? null })}\n\n`);
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
	const watcher = watch({
		input: fileURLToPath(import.meta.resolve("@antumbra/server/fixture-main.ts")),
		external: ["sharp"],
		platform: "node",
		output: { codeSplitting: false, file: output, format: "esm", paths: { sharp: fileURLToPath(import.meta.resolve("sharp")) } },
	});
	let rebuild = Promise.resolve();
	let initial = true;
	let built = false;
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
		watcher.on("event", (event) => {
			if (event.code === "START") built = false;
			if (event.code === "BUNDLE_END") built = true;
			if (event.code === "ERROR") failed(event.error);
			if (event.code === "END" && built && !stopping) {
				rebuild = rebuild.then(startChild).then(completed).catch(failed);
			}
		});
	});
	const http = createHttpServer();
	const routes: Connect.NextHandleFunction = (request, response, next) => {
		const address = http.address();
		const socket = address !== null && typeof address === "object" ? `ws://127.0.0.1:${address.port}` : "'self'";
		response.setHeader(
			"Content-Security-Policy",
			`default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:${port} ws://127.0.0.1:${port} ${socket}; img-src 'self' data: blob: http://127.0.0.1:${port}; frame-src 'none'; object-src 'none'`,
		);
		if (!request.url?.startsWith("/__fixture/")) {
			next();
			return;
		}
		if (request.url === `/__fixture/events?token=${token}`) {
			response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
			response.write(`data: ${JSON.stringify({ failure: failure ?? null })}\n\n`);
			observers.add(response);
			request.on("close", () => observers.delete(response));
			return;
		}
		if (request.headers.authorization !== `Bearer ${token}`) {
			response.writeHead(403).end();
			return;
		}
		const handle = async () => {
			if (request.url === "/__fixture/stop") {
				await shutdown();
				response.end(JSON.stringify({ stopped: true }));
				await closeRenderer();
				return;
			}
			if (request.url === "/__fixture/status") {
				response.end(JSON.stringify({ token, failure: failure ?? null }));
				return;
			}
			if (request.url === "/__fixture/metadata") {
				response.end(JSON.stringify({ label, captureCompletedAt }));
				return;
			}
			request.setEncoding("utf8");
			let body = "";
			for await (const chunk of request) body += Schema.decodeUnknownSync(Schema.String)(chunk);
			const raw: unknown = JSON.parse(body);
			const operation = request.url;
			const result = await drafts.runPromise(
				Effect.gen(function* () {
					const store = yield* ShellDrafts;
					if (operation === "/__fixture/draft/read") return yield* store.read(Schema.decodeUnknownSync(DraftRef)(raw));
					if (operation === "/__fixture/draft/write") {
						const value = Schema.decodeUnknownSync(Write)(raw);
						return yield* store.write(value, value.text);
					}
					const value = Schema.decodeUnknownSync(Clear)(raw);
					yield* store.clear(value, value.revision);
					return null;
				}),
			);
			response.setHeader("Content-Type", "application/json");
			response.end(JSON.stringify(result));
		};
		void handle().catch((error: unknown) => {
			response.writeHead(500).end(String(error));
		});
	};
	const renderer = await createServer({
		configFile: false,
		root: desktop,
		plugins: [
			react(),
			tailwind(),
			{
				name: "fixture-control",
				configureServer(server) {
					server.middlewares.use(routes);
				},
			},
		],
		server: {
			host: "127.0.0.1",
			middlewareMode: { server: http },
			ws: { server: http },
		},
	});
	http.on("request", renderer.middlewares);
	const closeRenderer = async () => {
		await renderer.close();
		if (http.listening) {
			const closed = once(http, "close");
			http.close();
			await closed;
		}
	};
	const shutdown = async () => {
		stopping = true;
		await watcher.close();
		await rebuild;
		await stopChild();
		await drafts.dispose();
		for (const response of observers) response.end();
	};

	process.once("SIGTERM", () => {
		void shutdown().then(closeRenderer);
	});
	try {
		await ready;
		const listening = once(http, "listening");
		http.listen(0, "127.0.0.1");
		await listening;
		const address = http.address();
		if (address === null || address === undefined || typeof address === "string") return;
		const url = `http://127.0.0.1:${address.port}/?fixture=1&port=${port}&token=${token}`;
		process.send?.({ url, token });
		process.stdout.write(`Fixture viewer: ${url}\n`);
	} catch (error) {
		await shutdown();
		await closeRenderer();
		throw error;
	}
};

export const fixtureViewer = Effect.promise(serve);
