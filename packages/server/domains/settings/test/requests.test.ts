import { AlreadyDone } from "@antumbra/feature/rejection.ts";
import { group } from "@antumbra/rpc/group.ts";
import * as Id from "@antumbra/vocabulary/id.ts";
import { Effect } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";
import { it, settingsApp } from "#test/kit.ts";

it.app("the same request id twice answers with the sequence number it already produced", function* (app) {
	const calls = yield* RpcTest.makeClient(group(settingsApp.features), { flatten: true });
	const requestId = Id.Request.make("request-1");
	const input = { key: "holdWakes", on: true, requestId } as const;

	const seq = yield* calls("settings.setFlag", input);
	const refused = yield* Effect.flip(calls("settings.setFlag", input));

	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId, seq });
	expect(yield* app.rows.flag.count({})).toBe(1);
});
