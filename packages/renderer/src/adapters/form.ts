import { useAtomSet } from "@effect/atom-react";
import { Effect, Exit, Schema } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { useState } from "react";
import { useAppForm } from "#forms/hook.ts";

export const useRequestForm = <Input, Output, A, E extends { readonly message: string }>({
	defaultValues,
	schema,
	request,
	onSuccess,
	resetAfterSuccess,
}: {
	readonly defaultValues: Input;
	readonly schema: Schema.Codec<Output, Input>;
	readonly request: (value: Output) => Effect.Effect<A, E>;
	readonly resetAfterSuccess: (submitted: Input) => Input;
	readonly onSuccess: (result: A) => void;
}) => {
	const [atom] = useState(() => Atom.fn((effect: Effect.Effect<A, E | Schema.SchemaError>) => effect));
	const submit = useAtomSet(atom, { mode: "promiseExit" });
	const form = useAppForm({
		defaultValues,
		validators: { onChange: Schema.toStandardSchemaV1(schema) },
		onSubmit: async ({ value, formApi }) => {
			const result = await submit(Schema.decodeEffect(schema)(value).pipe(Effect.flatMap(request)));
			if (Exit.isFailure(result)) return;
			formApi.reset(resetAfterSuccess(value));
			onSuccess(result.value);
		},
	});
	return Object.assign(form, { requestAtom: atom });
};
