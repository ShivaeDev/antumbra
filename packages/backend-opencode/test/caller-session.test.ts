import callerSession from "@antumbra/backend-opencode/plugin/caller-session.js";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { wireName } from "#adapters/tool-server.ts";

const stamped = (tool: string, args: Record<string, unknown>) =>
	Effect.gen(function* () {
		const hooks = yield* Effect.promise(callerSession);
		const output = { args };
		yield* Effect.promise(() => hooks["tool.execute.before"]({ callID: "call_1", sessionID: "ses_crew", tool }, output));
		return output.args;
	});

it.effect("stamps the calling session onto an antumbra tool's arguments", () =>
	Effect.map(stamped(wireName("read_board"), { since: 3 }), (args) => {
		expect(args).toEqual({ callerSession: "ses_crew", since: 3 });
	}),
);

it.effect("leaves the arguments of a tool opencode serves itself alone", () =>
	Effect.map(stamped("read", { filePath: "/moorage/README.md" }), (args) => {
		expect(args).toEqual({ filePath: "/moorage/README.md" });
	}),
);
