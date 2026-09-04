import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { Effect } from "effect";
import { createServer, type ViteDevServer, build as viteBuild } from "vite";

export const startRendererServer = (root: string, port: number) =>
	Effect.promise(() =>
		createServer({
			configFile: false,
			plugins: [react(), tailwind()],
			root,
			server: { port, strictPort: true },
		}).then((server) => server.listen()),
	);

export const stopRendererServer = (server: ViteDevServer) => Effect.promise(() => server.close());

export const buildRenderer = (root: string, outDir: string) =>
	Effect.promise(() =>
		viteBuild({
			base: "./",
			build: { emptyOutDir: true, outDir },
			configFile: false,
			plugins: [react(), tailwind()],
			root,
		}),
	);
