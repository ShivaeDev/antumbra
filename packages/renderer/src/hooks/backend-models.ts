import type { ModelChoice } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { backendModels } from "#adapters/trpc.ts";

export interface ModelCatalog {
	readonly choices: ReadonlyArray<ModelChoice>;
	readonly failure: string | null;
}

export const emptyCatalog: ModelCatalog = { choices: [], failure: null };

export const defaultModelId = (catalog: ModelCatalog): string => catalog.choices.find((choice) => choice.isDefault)?.id ?? "";

export const effortsFor = (catalog: ModelCatalog, model: string): ReadonlyArray<string> =>
	catalog.choices.find((choice) => choice.id === model)?.efforts ?? [];

export const useBackendModels = (backend: string): ModelCatalog => {
	const [catalog, setCatalog] = useState<ModelCatalog>(emptyCatalog);
	useEffect(() => {
		setCatalog(emptyCatalog);
		if (backend === "") {
			return;
		}
		let listening = true;
		backendModels(
			backend,
			(choices) => {
				if (listening) setCatalog({ choices, failure: null });
			},
			(failure) => {
				if (listening) setCatalog({ choices: [], failure });
			},
		);
		return () => {
			listening = false;
		};
	}, [backend]);
	return catalog;
};
