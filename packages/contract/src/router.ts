import { AppInfo, AppInfoSource } from "#app-info.ts";
import {
	ArtifactPresentationSource,
	OpenArtifactRequest,
} from "#artifact-presentation.ts";
import {
	type AppRuntime,
	makeProcedure,
	surface,
	trpc,
} from "#router-procedure.ts";
import { quayRoutes } from "#router-quay.ts";
import { sightRoutes } from "#router-sight.ts";
import { voyageRoutes } from "#router-voyages.ts";

export const makeAppRouter = (runtime: AppRuntime) => {
	const procedure = makeProcedure(runtime);
	return trpc.router({
		appInfo: procedure.output(AppInfo).query(function* () {
			const source = yield* AppInfoSource;
			return yield* source.current;
		}),
		openArtifact: procedure
			.input(OpenArtifactRequest)
			.mutation(function* (input) {
				const source = yield* ArtifactPresentationSource;
				return yield* surface(source.open(input));
			}),
		...quayRoutes(procedure),
		...sightRoutes(procedure),
		...voyageRoutes(procedure),
	});
};

export type AppRouter = ReturnType<typeof makeAppRouter>;
