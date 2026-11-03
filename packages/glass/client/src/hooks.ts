import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import type { Watch } from "@antumbra/platform-rpc/query.ts";
import type { Unauthorized } from "@antumbra/platform-rpc/token.ts";
import { type QueryState, useAction, useQuery } from "@shivaedev/react/client/resultState.ts";
import { type Cause, Layer } from "effect";
import * as Atom from "effect/reactivity/Atom";

export type Live<Query extends QueryShape, Failure> = QueryState<Query["output"]["Type"], Cause.NoSuchElementError | Failure | Unauthorized>;

export const useLive = <Query extends QueryShape, Failure>(query: Watch<Query, Failure>, input: Values<Query["input"]>): Live<Query, Failure> =>
	useQuery(query.atom(input));

const runtime = Atom.runtime(Layer.empty);

export const useCommand = <Command extends CommandShape, Failure>(command: Send<Command, Failure>) => {
	const action = useAction(runtime, (input: Values<Command["input"]>) => command(input));
	return { ...action, run: action.dispatch };
};
