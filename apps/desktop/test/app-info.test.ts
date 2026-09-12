import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { appInfo } from "#adapters/app-info.ts";
import { browserBridge } from "#browser/bridge.ts";

const LINK = "http://localhost:5183/?port=41267&token=a-dev-token";

it.effect("tells the shell and a browser tab the same product version", () =>
	Effect.gen(function* () {
		const shell = yield* appInfo;
		const browser = browserBridge(new URL(LINK)) ?? expect.unreachable("the link carries a port and a token");
		const tab = yield* Effect.promise(() => browser.appInfo());
		expect(tab.productVersion).toBe(shell.productVersion);
		expect(shell.productVersion).not.toBe("");
	}),
);
