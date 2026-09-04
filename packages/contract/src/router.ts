import { AppInfo, AppInfoSource } from "#app-info.ts";
import { AppLifecycleSource } from "#app-lifecycle.ts";
import { type AppRuntime, makeProcedure, trpc } from "#router-procedure.ts";
import { quayRoutes } from "#router-quay.ts";
import { rulingRoutes } from "#router-rulings.ts";
import { sightRoutes } from "#router-sight.ts";
import { voyageRoutes } from "#router-voyages.ts";
import { windowRoutes } from "#router-windows.ts";
import { SettingChange, SettingsReading, SettingsSource } from "#settings/readings.ts";

export const makeAppRouter = (runtime: AppRuntime) => {
	const procedure = makeProcedure(runtime);
	return trpc.router({
		appInfo: procedure.output(AppInfo).query(function* () {
			const source = yield* AppInfoSource;
			return yield* source.current;
		}),
		changeSetting: procedure
			.input(SettingChange)
			.output(SettingsReading)
			.mutation(function* (input) {
				return yield* (yield* SettingsSource).change(input);
			}),
		restart: procedure.mutation(function* () {
			yield* (yield* AppLifecycleSource).restart;
		}),
		settings: procedure.output(SettingsReading).query(function* () {
			return yield* (yield* SettingsSource).current;
		}),
		...quayRoutes(procedure),
		...rulingRoutes(procedure),
		...sightRoutes(procedure),
		...voyageRoutes(procedure),
		...windowRoutes(procedure),
	});
};

export type AppRouter = ReturnType<typeof makeAppRouter>;
