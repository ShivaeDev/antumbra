import type { CommandShape } from "@antumbra/feature/command.ts";
import type { Values } from "@antumbra/feature/fields.ts";
import type { QueryShape } from "@antumbra/feature/query.ts";
import type { RejectedBy } from "@antumbra/feature/rejection.ts";
import type { Send } from "@antumbra/rpc/client.ts";
import type { Watch } from "@antumbra/rpc/query.ts";
import type { Unauthorized } from "@antumbra/rpc/token.ts";
import { useAtomValue } from "@effect/atom-react";
import type { Cause, Effect } from "effect";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useCallback } from "react";

export type Live<Query extends QueryShape, Failure> = AsyncResult.AsyncResult<
	Query["output"]["Type"],
	Cause.NoSuchElementError | Failure | Unauthorized
>;

export type Sending<Command extends CommandShape, Failure> = (
	input: Values<Command["input"]>,
) => Effect.Effect<number, Failure | RejectedBy<Command["rejections"]> | Unauthorized>;

export const useLive = <Query extends QueryShape, Failure>(query: Watch<Query, Failure>, input: Values<Query["input"]>): Live<Query, Failure> =>
	useAtomValue(query.atom(input));

export const useSend = <Command extends CommandShape, Failure>(command: Send<Command, Failure>): Sending<Command, Failure> =>
	useCallback((input: Values<Command["input"]>) => command(input), [command]);
