import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { lostConnection, type Watch } from "@antumbra/platform-rpc/query.ts";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";
import { useLive } from "#hooks.ts";
import { Holding, RECONNECTING } from "#reconnection.tsx";

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

export const reading = <A,>(result: AsyncResult.AsyncResult<A, unknown>, words: string, shown: (value: A) => ReactNode): ReactNode =>
	AsyncResult.match(result, {
		onFailure: (failure) => {
			if (!lostConnection(failure)) return failed;
			const last = failure.previousSuccess;
			if (Option.isNone(last)) return reconnecting;
			return <Holding held>{shown(last.value.value)}</Holding>;
		},
		onInitial: () => <span className="block text-xs text-muted-foreground">{words}</span>,
		onSuccess: (success) => <Holding held={false}>{shown(success.value)}</Holding>,
	});

export const Live = <Query extends QueryShape, Failure>(props: {
	readonly children: (value: Query["output"]["Type"]) => ReactNode;
	readonly input: Values<Query["input"]>;
	readonly query: Watch<Query, Failure>;
	readonly waiting?: string;
}): ReactNode => reading(useLive(props.query, props.input), props.waiting ?? WAITING, props.children);
