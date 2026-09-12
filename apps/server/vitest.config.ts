import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "server",
					environment: "node",
					include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
					exclude: ["test/glass/**"],
				},
			},
			{
				test: {
					name: "glass",
					environment: "happy-dom",
					include: ["test/glass/**/*.test.ts", "test/glass/**/*.test.tsx"],
					setupFiles: ["./test/glass/setup.ts"],
				},
			},
		],
	},
});
