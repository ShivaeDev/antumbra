import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";

const UNREACHED = "The server could not be reached";

export const reading = <A,>(result: AsyncResult.AsyncResult<A, unknown>, words: string, shown: (value: A) => ReactNode): ReactNode =>
	AsyncResult.match(result, {
		onFailure: () => (
			<p className="text-2xs text-destructive" role="alert">
				{UNREACHED}
			</p>
		),
		onInitial: () => <p className="text-xs text-muted-foreground">{words}</p>,
		onSuccess: (success) => shown(success.value),
	});
