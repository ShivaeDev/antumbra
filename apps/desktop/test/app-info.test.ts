import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { appInfo } from "#adapters/app-info.ts";
import { browserBridge } from "#browser/bridge.ts";
import { version } from "#package.json";

const LINK = "http://localhost:5183/?port=41267&token=a-dev-token";

it.effect("tells the shell and a browser tab the version the desktop package declares", () =>
	Effect.gen(function* () {
		const shell = yield* appInfo;
		const browser = browserBridge(new URL(LINK)) ?? expect.unreachable("the link carries a port and a token");
		const tab = yield* Effect.promise(() => browser.appInfo());
		expect(shell.productVersion).toBe(version);
		expect(tab.productVersion).toBe(version);
	}),
);
