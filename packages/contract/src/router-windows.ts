import { type AppProcedure, surface } from "#router-procedure.ts";
import { WindowPlace, WindowSource } from "#windows.ts";

export const windowRoutes = (procedure: AppProcedure) => ({
	openWindow: procedure.input(WindowPlace).mutation(function* (input) {
		const windows = yield* WindowSource;
		yield* surface(windows.open(input));
	}),
	rememberPlace: procedure.input(WindowPlace).mutation(function* (input) {
		const windows = yield* WindowSource;
		yield* surface(windows.remember(input));
	}),
	windowPlace: procedure.output(WindowPlace).query(function* () {
		const windows = yield* WindowSource;
		return yield* surface(windows.place);
	}),
});
