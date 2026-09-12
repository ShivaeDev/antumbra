import { answered, it } from "@antumbra/app-testing/entry.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { expect } from "vitest";
import { registerRepoTool } from "#tools/repos/tools.ts";

it.app("registers a repository and reuses its identity when the default ref changes", function* (app) {
	const context = { agentId: "captain", sessionId: "session", callId: "first" };
	const source = "https://github.com/fleet/chart.git";
	const first = yield* registerRepoTool.invoke(context, { source, defaultRef: "main" });
	expect(first).toEqual({ ok: true, text: `registered repo ${requestId(context)} chart · ${source} · default ref main` });
	expect(yield* registerRepoTool.invoke(context, { source, defaultRef: "main" })).toEqual(first);
	expect(yield* registerRepoTool.invoke({ ...context, callId: "second" }, { source, defaultRef: "develop" })).toEqual({
		ok: true,
		text: `already registered repo ${requestId(context)} chart · ${source} · default ref develop`,
	});
	const registered = yield* answered(app.api.repos.all({}));
	expect(registered).toHaveLength(1);
	expect(registered[0]).toMatchObject({ id: requestId(context), source, defaultRef: "develop" });
});
