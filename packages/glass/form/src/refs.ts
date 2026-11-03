import * as Atom from "effect/reactivity/Atom";
import type * as AtomRef from "effect/reactivity/AtomRef";

export const fromRef = <A>(ref: AtomRef.ReadonlyRef<A>): Atom.Atom<A> =>
	Atom.readable((get) => {
		get.addFinalizer(ref.subscribe((value) => get.setSelf(value)));
		return ref.value;
	});
