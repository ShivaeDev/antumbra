import { Data, type Duration, type Effect, type Schema } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRef from "effect/unstable/reactivity/AtomRef";
import type { FieldMessages } from "#messages.ts";

export type Fields = Schema.Struct.Fields;

export type Encoded<F extends Fields> = Schema.Struct.Encoded<F>;

export type Decoded<F extends Fields> = Schema.Struct.Type<F>;

export type Name<F extends Fields> = keyof Encoded<F> & string;

export type Services<F extends Fields, R> = R | Schema.Struct.DecodingServices<F>;

export class FieldFailure extends Data.TaggedError("FieldFailure")<{ readonly message: string; readonly path: string }> {}

export class Invalid extends Data.TaggedError("Invalid")<{ readonly messages: FieldMessages }> {}

export interface Submitter<N extends string> {
	readonly fail: (path: N, message: string) => Effect.Effect<never, FieldFailure>;
}

export type Checks<F extends Fields, R> = {
	readonly [K in Name<F>]?: (value: Encoded<F>[K]) => Effect.Effect<string | undefined, never, R>;
};

export interface Config<F extends Fields, A, E, R, ER> {
	readonly checks?: Checks<F, R>;
	readonly debounce?: Duration.Input;
	readonly initialValues: Encoded<F>;
	readonly onSubmit: (values: Decoded<F>, submitter: Submitter<Name<F>>) => Effect.Effect<A, E, R>;
	readonly runtime: Atom.AtomRuntime<Services<F, R>, ER>;
}

export interface Form<F extends Fields, A, E, ER> {
	readonly blur: (name: Name<F>) => void;
	readonly change: <K extends Name<F>>(name: K, value: Encoded<F>[K]) => void;
	readonly choices: <K extends Name<F>>(name: K) => readonly Encoded<F>[K][] | undefined;
	readonly dirty: Atom.Atom<boolean>;
	readonly error: (name: Name<F>) => Atom.Atom<string | undefined>;
	readonly field: <K extends Name<F>>(name: K) => AtomRef.AtomRef<Encoded<F>[K]>;
	readonly submit: Atom.AtomResultFn<void, A, E | ER | FieldFailure | Invalid>;
	readonly submitting: Atom.Atom<boolean>;
	readonly values: AtomRef.AtomRef<Encoded<F>>;
}

export interface Holder {
	readonly prop: (name: string) => AtomRef.AtomRef<unknown>;
}

export function holder(values: object): Holder;
export function holder(values: object): unknown {
	return values;
}

export function fieldOf<Value>(ref: AtomRef.AtomRef<unknown>): AtomRef.AtomRef<Value>;
export function fieldOf(ref: AtomRef.AtomRef<unknown>): unknown {
	return ref;
}

export function choicesOf<Value>(choices: readonly unknown[] | undefined): readonly Value[] | undefined;
export function choicesOf(choices: readonly unknown[] | undefined): unknown {
	return choices;
}

export function checkOf<R>(check: unknown): (value: unknown) => Effect.Effect<string | undefined, never, R>;
export function checkOf(check: unknown): unknown {
	return check;
}
