import { Equal } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRef from "effect/unstable/reactivity/AtomRef";

interface Draft<Values> {
	readonly baseline: Values;
	readonly current: Values;
}

const changed = <Values extends Readonly<Record<string, unknown>>>({ baseline, current }: Draft<Values>): boolean =>
	Object.keys(baseline).some((name) => !Equal.equals(current[name], baseline[name]));

export const draft = <Values extends Readonly<Record<string, unknown>>>(initial: Values) => {
	const state = AtomRef.make<Draft<Values>>({ baseline: initial, current: initial });
	return {
		accept: (baseline: Values): void => {
			state.update((current) => ({ ...current, baseline }));
		},
		dirty: Atom.readable((get) => {
			get.addFinalizer(state.subscribe((value) => get.setSelf(changed(value))));
			return changed(state.value);
		}),
		receive: (incoming: Values): void => {
			if (!changed(state.value)) {
				state.set({ baseline: incoming, current: incoming });
			}
		},
		values: state.prop("current"),
	};
};
