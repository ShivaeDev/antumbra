import { useRef, useState } from "react";

export type Call<A> = (
	onDone: (value: A) => void,
	onError: (message: string) => void,
) => void;

export type CallState<A> =
	| { readonly _tag: "done"; readonly value: A }
	| { readonly _tag: "failed"; readonly message: string }
	| { readonly _tag: "idle" }
	| { readonly _tag: "pending" };

export interface Caller<A> {
	readonly reset: () => void;
	readonly run: (call: Call<A>) => void;
	readonly state: CallState<A>;
}

const idle = { _tag: "idle" } as const;
const pending = { _tag: "pending" } as const;

export const useCall = <A>(): Caller<A> => {
	const [state, setState] = useState<CallState<A>>(idle);
	// why: a run is identified by the ticket it took. Answers to a ticket that
	// is no longer current are dropped, which is what makes a second click and
	// a late reply safe: one run settles once, and the newest run wins.
	const issued = useRef(0);

	const settling = (ticket: number) => (answer: CallState<A>) => {
		if (issued.current !== ticket) return;
		issued.current += 1;
		setState(answer);
	};

	const run = (call: Call<A>): void => {
		issued.current += 1;
		const settle = settling(issued.current);
		setState(pending);
		call(
			(value) => settle({ _tag: "done", value }),
			(message) => settle({ _tag: "failed", message }),
		);
	};

	const reset = (): void => {
		issued.current += 1;
		setState(idle);
	};

	return { reset, run, state };
};
