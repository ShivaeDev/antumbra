import { AppInfo, AppInfoSource } from "#app-info.ts";
import { type AppRuntime, makeProcedure, trpc } from "#router-procedure.ts";
import { quayRoutes } from "#router-quay.ts";
import { sightRoutes } from "#router-sight.ts";
import { voyageRoutes } from "#router-voyages.ts";
import { windowRoutes } from "#router-windows.ts";
import { Settings, SettingsSource, UpdateSettings } from "#settings.ts";

export const makeAppRouter = (runtime: AppRuntime) => {
	const procedure = makeProcedure(runtime);
	return trpc.router({
		appInfo: procedure.output(AppInfo).query(function* () {
			const source = yield* AppInfoSource;
			return yield* source.current;
		}),
		settings: procedure.output(Settings).query(function* () {
			return yield* (yield* SettingsSource).current;
		}),
		updateSettings: procedure
			.input(UpdateSettings)
			.output(Settings)
			.mutation(function* (input) {
				return yield* (yield* SettingsSource).update(input);
			}),
		...quayRoutes(procedure),
		...sightRoutes(procedure),
		...voyageRoutes(procedure),
		...windowRoutes(procedure),
	});
};

export type AppRouter = ReturnType<typeof makeAppRouter>;
