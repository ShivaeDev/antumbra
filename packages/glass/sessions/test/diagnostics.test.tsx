import { answered } from "@antumbra/app-testing/answers.ts";
import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { Diagnostics } from "#diagnostics.tsx";

it.glass("a requested birth remains diagnosable before its conversation starts", function* ({ api, render }) {
	const requested = Request.make("agent:surveyor");
	const { agentId, sessionId } = identity(requested);
	yield* api.agents.spawn({ requestId: requested, role: "surveyor", backend: "claude", model: null, effort: null });
	const agent = yield* answered(api.agents.reading({ id: agentId }));
	if (agent === null) return yield* Effect.die("Missing requested Agent reading");
	const container = yield* render(<Diagnostics api={api} agent={agent} />);
	yield* press(container, "diagnostics");
	yield* until(() => container.textContent?.includes("birth · requested") === true, "the pending birth diagnostic");
	expect(container.textContent).toContain(`current ${sessionId}`);
});
