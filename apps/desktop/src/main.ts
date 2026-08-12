import { makeAppRouter } from "@antumbra/contract";
import { Effect, ManagedRuntime } from "effect";
import { AppInfoSourceLive } from "./adapters/app-info.js";
import {
	openMainWindow,
	quitWhenAllWindowsClosed,
	whenReady,
} from "./adapters/shell.js";
import { registerTrpcBridge } from "./adapters/trpc-bridge.js";

const runtime = ManagedRuntime.make(AppInfoSourceLive);
const router = makeAppRouter(runtime);

const main = Effect.gen(function* () {
	yield* whenReady;
	yield* Effect.sync(() => {
		registerTrpcBridge(router);
	});
	yield* quitWhenAllWindowsClosed;
	yield* openMainWindow;
});

runtime.runFork(main);
