import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import type { Watch } from "@antumbra/platform-rpc/query.ts";
import type { Unauthorized } from "@antumbra/platform-rpc/token.ts";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { type Cause, Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useState } from "react";

export type Live<Query extends QueryShape, Failure> = AsyncResult.AsyncResult<
	Query["output"]["Type"],
	Cause.NoSuchElementError | Failure | Unauthorized
>;

export const useLive = <Query extends QueryShape, Failure>(query: Watch<Query, Failure>, input: Values<Query["input"]>): Live<Query, Failure> =>
	useAtomValue(query.atom(input));

export const useCommand = <Command extends CommandShape, Failure>(command: Send<Command, Failure>) => {
	type Invocation = { readonly command: Send<Command, Failure>; readonly input: Values<Command["input"]> };
	const [acting] = useState(() =>
		Atom.fn<Invocation>()(({ command, input }) =>
			Effect.map(Effect.exit(command(input)), (exit) => ({ command, result: AsyncResult.fromExit(exit) })),
		),
	);
	const state = useAtomValue(acting);
	const activate = useAtomSet(acting);
	const result =
		AsyncResult.isSuccess(state) && state.value.command === command && !state.waiting
			? state.value.result
			: AsyncResult.initial<number, Failure | RejectedBy<Command["rejections"]> | Unauthorized>(state.waiting);
	return { pending: state.waiting, result, run: (input: Values<Command["input"]>) => activate({ command, input }) };
};
