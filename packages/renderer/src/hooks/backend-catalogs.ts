import type { ModelChoice } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { backendModels } from "#adapters/trpc.ts";

export interface BackendModels {
	readonly failure: string | null;
	readonly models: ReadonlyArray<ModelChoice>;
	readonly tag: string;
}

type Listed = Readonly<Record<string, { readonly failure: string | null; readonly models: ReadonlyArray<ModelChoice> }>>;

export const useBackendCatalogs = (backends: ReadonlyArray<string>): ReadonlyArray<BackendModels> => {
	const [listed, setListed] = useState<Listed>({});
	const named = backends.join(" ");
	useEffect(() => {
		let listening = true;
		for (const tag of named === "" ? [] : named.split(" ")) {
			backendModels(
				tag,
				(models) => {
					if (listening) {
						setListed((known) => ({ ...known, [tag]: { failure: null, models } }));
					}
				},
				(failure) => {
					if (listening) {
						setListed((known) => ({ ...known, [tag]: { failure, models: [] } }));
					}
				},
			);
		}
		return () => {
			listening = false;
		};
	}, [named]);
	const catalogs: BackendModels[] = [];
	for (const tag of backends) {
		const known = listed[tag];
		catalogs.push({ failure: known?.failure ?? null, models: known?.models ?? [], tag });
	}
	return catalogs;
};
