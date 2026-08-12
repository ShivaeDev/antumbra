import {
	type EffectTRPCRuntime,
	makeEffectTRPC,
	makeRequestServices,
} from "@shivaedev/effect-trpc";
import { initTRPC } from "@trpc/server";
import { Context, Layer } from "effect";
import { AppInfo, AppInfoSource } from "#app-info.js";

export interface RequestContext {
	readonly senderId: number;
}

export class RequestOrigin extends Context.Service<
	RequestOrigin,
	RequestContext
>()("@antumbra/contract/RequestOrigin") {}

const t = initTRPC.context<RequestContext>().create();

const requestServices = makeRequestServices((context: RequestContext) =>
	Layer.succeed(RequestOrigin, context),
);

export const makeAppRouter = (
	runtime: EffectTRPCRuntime<AppInfoSource, never>,
) => {
	const adapter = makeEffectTRPC({ runtime });
	const procedure = adapter.procedure(t.procedure, requestServices);
	return t.router({
		appInfo: procedure.output(AppInfo).query(function* () {
			const source = yield* AppInfoSource;
			return yield* source.current;
		}),
	});
};

export type AppRouter = ReturnType<typeof makeAppRouter>;
