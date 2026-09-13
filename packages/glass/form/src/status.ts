import * as AtomRef from "effect/unstable/reactivity/AtomRef";
import { type FieldMessages, noMessages, withoutField } from "#messages.ts";
import { fromRef } from "#refs.ts";

interface State {
	readonly failures: FieldMessages;
	readonly submitted: boolean;
	readonly touched: Readonly<Record<string, true>>;
}

export const statusOf = () => {
	const state = AtomRef.make<State>({ failures: noMessages, submitted: false, touched: {} });
	return {
		attempt: (): void => {
			state.update((current) => ({ ...current, failures: noMessages, submitted: true }));
		},
		failures: fromRef(state.prop("failures")),
		note: (path: string, message: string): void => {
			state.update((current) => ({ ...current, failures: { ...current.failures, [path]: message } }));
		},
		submitted: fromRef(state.prop("submitted")),
		touch: (name: string): void => {
			state.update((current) =>
				current.touched[name] === true && !(name in current.failures)
					? current
					: { ...current, failures: withoutField(current.failures, name), touched: { ...current.touched, [name]: true } },
			);
		},
		touched: fromRef(state.prop("touched")),
	};
};
