import type { QueryShape } from "@antumbra/feature/query.ts";
import { type Watching, watching } from "@antumbra/rpc/query.ts";
import { useAtomValue } from "@effect/atom-react";
import { Stream } from "effect";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
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

export const useChoices = (
	query: QueryShape | undefined,
	input: Readonly<Record<string, unknown>> | undefined,
): AsyncResult.AsyncResult<unknown, unknown> => {
	const wiring = useContext(WiringContext);
	return useAtomValue((query === undefined ? nothing : wiring.watch(query)).atom(input ?? {}));
};
