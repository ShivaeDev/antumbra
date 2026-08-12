import { Effect } from "effect";
import { createServer, build as viteBuild } from "vite";

export const startRendererServer = (root: string, port: number) =>
	Effect.promise(() =>
		createServer({
			configFile: false,
			root,
			server: { port, strictPort: true },
		}).then((server) => server.listen()),
	);

export const buildRenderer = (root: string, outDir: string) =>
	Effect.promise(() =>
		viteBuild({
			base: "./",
			build: { emptyOutDir: true, outDir },
			configFile: false,
			root,
		}),
	);
