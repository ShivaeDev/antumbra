import { AlreadyDone } from "@antumbra/feature/rejection.ts";
import { group } from "@antumbra/rpc/group.ts";
import * as Id from "@antumbra/vocabulary/id.ts";
import { Effect } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";
import { FLEET } from "#ids.ts";
import { it, roleSettingsApp } from "#test/kit.ts";

it.app("the same request id twice answers with the sequence number it already produced", function* (app) {
	const calls = yield* RpcTest.makeClient(group(roleSettingsApp.features), { flatten: true });
	const requestId = Id.Request.make("request-1");
	const input = { backend: "codex", effort: null, model: null, requestId, role: "crew", scope: FLEET } as const;

	const seq = yield* calls("roleSettings.choose", input);
	const refused = yield* Effect.flip(calls("roleSettings.choose", input));

	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId, seq });
	expect(yield* app.rows.roleSetting.count({ scope: FLEET })).toBe(1);
});
