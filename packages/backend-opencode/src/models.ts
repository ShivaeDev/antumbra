import type { BackendFailure, ModelChoice } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { opencodeFailure } from "#failure.ts";
import { ProvidersResponse } from "#protocol.ts";
import type { OpencodeServer } from "#server.ts";

const decodeProviders = Schema.decodeUnknownOption(ProvidersResponse);

const catalogue = (response: unknown): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	Option.match(decodeProviders(response), {
		onNone: () => Effect.fail(opencodeFailure("GET /config/providers returned no catalog")),
		onSome: ({ default: defaults, providers }) =>
			Effect.succeed(
				providers.flatMap((provider) =>
					Object.values(provider.models).map((model) => ({
						efforts: Object.keys(model.variants ?? {}),
						id: `${provider.id}/${model.id}`,
						isDefault: defaults[provider.id] === model.id,
						name: model.name,
					})),
				),
			),
	});

export const listOpencodeModels = (server: OpencodeServer): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	server.get({ body: undefined, path: "/config/providers", query: {} }).pipe(Effect.flatMap(catalogue));
