import { once } from "node:events";
import { createServer as createHttpServer, type ServerResponse } from "node:http";
import { dirname } from "node:path";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Connect, createServer } from "vite";
import { fixtureDrafts } from "#script/adapters/fixture/drafts.ts";
import type { FixtureServer } from "#script/adapters/fixture/server.ts";

export const fixtureRenderer = async (directory: string, label: string, captureCompletedAt: string, token: string, server: FixtureServer) => {
	const desktop = dirname(dirname(dirname(import.meta.dirname)));
	const drafts = fixtureDrafts(directory);
	const observers = new Set<ServerResponse>();
	const http = createHttpServer();
	const routes: Connect.NextHandleFunction = (request, response, next) => {
		const address = http.address();
		const socket = address !== null && typeof address === "object" ? `ws://127.0.0.1:${address.port}` : "'self'";
		response.setHeader(
			"Content-Security-Policy",
			`default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:${server.port} ws://127.0.0.1:${server.port} ${socket}; img-src 'self' data: blob: http://127.0.0.1:${server.port}; frame-src 'none'; object-src 'none'`,
		);
		if (!request.url?.startsWith("/__fixture/")) {
			next();
			return;
		}
		if (request.url === `/__fixture/events?token=${token}`) {
			response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
			response.write(`data: ${JSON.stringify({ failure: server.failure ?? null })}\n\n`);
			observers.add(response);
			const unsubscribe = server.subscribe((failure) => response.write(`data: ${JSON.stringify({ failure: failure ?? null })}\n\n`));
			request.on("close", () => {
				observers.delete(response);
				unsubscribe();
			});
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
				response.end(JSON.stringify({ token, failure: server.failure ?? null }));
				return;
			}
			if (request.url === "/__fixture/metadata") {
				response.end(JSON.stringify({ label, captureCompletedAt }));
				return;
			}
			const result = await drafts.request(request);
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
		await server.stop();
		await drafts.dispose();
		for (const response of observers) response.end();
	};
	return {
		shutdown,
		close: closeRenderer,
		listen: async () => {
			const listening = once(http, "listening");
			http.listen(0, "127.0.0.1");
			await listening;
			const address = http.address();
			if (address === null || typeof address === "string") throw new Error("Fixture HTTP address unavailable");
			return `http://127.0.0.1:${address.port}/?fixture=1&port=${server.port}&token=${token}`;
		},
	};
};
