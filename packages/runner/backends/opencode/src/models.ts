import type { BackendFailure, ModelChoice } from "@antumbra/runner-ports/backend.ts";
import { Effect, Option, Schema } from "effect";
import { opencodeFailure } from "#failure.ts";
import { ProvidersResponse } from "#protocol.ts";
import type { OpencodeServer } from "#server.ts";

const decodeProviders = Schema.decodeUnknownOption(ProvidersResponse);

type Providers = typeof ProvidersResponse.Type;

// Opencode names a default model per provider; the fleet asks each backend for one, so the first provider's default stands for opencode.
const catalogued = ({ default: defaults, providers }: Providers): ReadonlyArray<ModelChoice> => {
	const listed: ModelChoice[] = [];
	let preferred: string | undefined;
	for (const provider of providers) {
		for (const model of Object.values(provider.models)) {
			const id = `${provider.id}/${model.id}`;
			if (preferred === undefined && defaults[provider.id] === model.id) preferred = id;
			listed.push({ defaultEffort: null, efforts: Object.keys(model.variants ?? {}), id, isDefault: false, name: model.name });
		}
	}
	const standing = preferred ?? listed[0]?.id;
	return listed.map((model) => (model.id === standing ? { ...model, isDefault: true } : model));
};

const catalogue = (response: unknown): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	Option.match(decodeProviders(response), {
		onNone: () => Effect.fail(opencodeFailure("GET /config/providers returned no catalog")),
		onSome: (listing) => Effect.succeed(catalogued(listing)),
	});

export const listOpencodeModels = (server: OpencodeServer): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	server.get({ body: undefined, path: "/config/providers", query: {} }).pipe(Effect.flatMap(catalogue));
