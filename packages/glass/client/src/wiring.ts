import { type Watching, watching } from "@antumbra/glass-client/query.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { type QueryState, useQuery } from "@shivaedev/react/client/resultState.ts";
import { Stream } from "effect";
import { createContext, useContext } from "react";

export interface Wiring {
	readonly watch: (query: QueryShape) => Watching;
}

const nothing = watching({}, () => Stream.make([]));

export const unwired: Wiring = { watch: () => nothing };

export const WiringContext = createContext<Wiring>(unwired);

export const wiringOf = (queries: ReadonlyMap<QueryShape, Watching>): Wiring => ({
	watch: (query) => queries.get(query) ?? nothing,
});

export const useChoices = (query: QueryShape | undefined, input: Readonly<Record<string, unknown>> | undefined): QueryState<unknown, unknown> => {
	const wiring = useContext(WiringContext);
	return useQuery((query === undefined ? nothing : wiring.watch(query)).atom(input ?? {}));
};
