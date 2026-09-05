import { expect, it } from "@effect/vitest";
import { serveCommand } from "#adapters/serve.ts";

it("the server child is started with Antumbra's skills in its config", () => {
	expect(serveCommand("/opt/homebrew/bin/opencode", "/antumbra/skills")).toEqual({
		args: [
			"-c",
			'export OPENCODE_CONFIG_CONTENT="$1"; shift; exec "$0" "$@"',
			"/opt/homebrew/bin/opencode",
			'{"skills":{"paths":["/antumbra/skills"]}}',
			"serve",
			"--port",
			"0",
			"--hostname",
			"127.0.0.1",
		],
		command: "/bin/sh",
	});
});
