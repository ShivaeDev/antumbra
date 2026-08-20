import { AppInfo, AppInfoSource } from "#app-info.ts";
import { type AppRuntime, makeProcedure, trpc } from "#router-procedure.ts";
import { quayRoutes } from "#router-quay.ts";
import { sightRoutes } from "#router-sight.ts";
import { voyageRoutes } from "#router-voyages.ts";
import { windowRoutes } from "#router-windows.ts";

export const makeAppRouter = (runtime: AppRuntime) => {
	const procedure = makeProcedure(runtime);
	return trpc.router({
		appInfo: procedure.output(AppInfo).query(function* () {
			const source = yield* AppInfoSource;
			return yield* source.current;
		}),
		...quayRoutes(procedure),
		...sightRoutes(procedure),
		...voyageRoutes(procedure),
		...windowRoutes(procedure),
	});
};

export type AppRouter = ReturnType<typeof makeAppRouter>;
