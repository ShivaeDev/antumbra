import { useState } from "react";

export type Call<A> = (onDone: (value: A) => void, onError: (message: string) => void) => void;

export type CallState<A> =
	| { readonly _tag: "done"; readonly value: A }
	| { readonly _tag: "failed"; readonly message: string }
	| { readonly _tag: "idle" }
	| { readonly _tag: "pending" };

interface Caller<A> {
	readonly reset: () => void;
	readonly run: (call: Call<A>) => void;
	readonly state: CallState<A>;
}

const idle = { _tag: "idle" } as const;
const pending = { _tag: "pending" } as const;

export const useCall = <A>(): Caller<A> => {
	const [state, setState] = useState<CallState<A>>(idle);

	const run = (call: Call<A>): void => {
		setState(pending);
		call(
			(value) => setState({ _tag: "done", value }),
			(message) => setState({ _tag: "failed", message }),
		);
	};

	const reset = (): void => {
		setState(idle);
	};

	return { reset, run, state };
};
