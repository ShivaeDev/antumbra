import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		projects: [
			{ test: { root, name: "app-testing/app", include: ["test/**/*.test.ts"] } },
			{
				extends: fileURLToPath(new URL("./src/glass/config.ts", import.meta.url)),
				test: { root, name: "app-testing/glass", include: ["test/**/*.test.tsx"] },
			},
		],
	},
});
