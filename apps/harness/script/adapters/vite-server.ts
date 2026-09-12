import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { Effect } from "effect";
import { createServer } from "vite";

export const startHarnessServer = (root: string, workspaceRoot: string, port: number) =>
	Effect.promise(() =>
		createServer({
			configFile: false,
			plugins: [react(), tailwind()],
			root,
			server: { fs: { allow: [workspaceRoot] }, port, strictPort: true },
		}).then((server) => server.listen()),
	);
