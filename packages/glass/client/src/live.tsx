import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { lostConnection, type Watch } from "@antumbra/platform-rpc/query.ts";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";
import { useLive } from "#hooks.ts";
import { Holding, RECONNECTING, useHolding } from "#reconnection.tsx";

const WAITING = "Reading…";

const reconnecting = (
	<span className="block text-xs text-muted-foreground" role="status">
		{RECONNECTING}
	</span>
);

const failed = (
	<span className="block text-2xs text-destructive" role="alert">
		This reading failed
	</span>
);

export const lastRead = <A,>(result: AsyncResult.AsyncResult<A, unknown>): Option.Option<A> => {
	if (AsyncResult.isSuccess(result)) return Option.some(result.value);
	if (!AsyncResult.isFailure(result) || !lostConnection(result)) return Option.none();
	return Option.map(result.previousSuccess, (success) => success.value);
};

export const reading = <A,>(result: AsyncResult.AsyncResult<A, unknown>, words: string, shown: (value: A) => ReactNode): ReactNode => {
	const last = lastRead(result);
	if (Option.isSome(last)) return <Holding held={!AsyncResult.isSuccess(result)}>{shown(last.value)}</Holding>;
	if (AsyncResult.isFailure(result)) return lostConnection(result) ? reconnecting : failed;
	return <span className="block text-xs text-muted-foreground">{words}</span>;
};

export const useReading = <Query extends QueryShape, Failure>(
	query: Watch<Query, Failure>,
	input: Values<Query["input"]>,
): Query["output"]["Type"] | undefined => {
	const result = useLive(query, input);
	const last = lastRead(result);
	useHolding(Option.isSome(last) && !AsyncResult.isSuccess(result));
	return Option.getOrUndefined(last);
};

export const Live = <Query extends QueryShape, Failure>(props: {
	readonly children: (value: Query["output"]["Type"]) => ReactNode;
	readonly input: Values<Query["input"]>;
	readonly query: Watch<Query, Failure>;
	readonly waiting?: string;
}): ReactNode => reading(useLive(props.query, props.input), props.waiting ?? WAITING, props.children);
