import { useAtomRef, useAtomSet, useAtomValue } from "@effect/atom-react";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useCallback, useMemo } from "react";
import type { Encoded, FieldFailure, Fields, Form, Invalid, Name } from "#shape.ts";

export interface Field<F extends Fields, K extends Name<F>> {
	readonly choices: readonly Encoded<F>[K][] | undefined;
	readonly error: string | undefined;
	readonly name: K;
	readonly onBlur: () => void;
	readonly onChange: (value: Encoded<F>[K]) => void;
	readonly value: Encoded<F>[K];
}

export const useField = <F extends Fields, A, E, ER, K extends Name<F>>(form: Form<F, A, E, ER>, name: K): Field<F, K> => {
	const value = useAtomRef(form.field(name));
	const error = useAtomValue(form.error(name));
	const onChange = useCallback((next: Encoded<F>[K]) => form.change(name, next), [form, name]);
	const onBlur = useCallback(() => form.blur(name), [form, name]);
	const choices = useMemo(() => form.choices(name), [form, name]);
	return { choices, error, name, onBlur, onChange, value };
};

export interface Submit<A, E> {
	readonly result: AsyncResult.AsyncResult<A, E>;
	readonly run: () => void;
	readonly submitting: boolean;
}

export const useSubmit = <F extends Fields, A, E, ER>(form: Form<F, A, E, ER>): Submit<A, E | ER | FieldFailure | Invalid> => {
	const result = useAtomValue(form.submit);
	const set = useAtomSet(form.submit);
	const run = useCallback(() => set(), [set]);
	return { result, run, submitting: result.waiting };
};

export const useDirty = <F extends Fields, A, E, ER>(form: Form<F, A, E, ER>): boolean => useAtomValue(form.dirty);
