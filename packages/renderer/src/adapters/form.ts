import { Effect, Exit, Schema } from "effect";
import { useRequest } from "#adapters/request.ts";
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
	const { requestAtom, submit } = useRequest<A, E | Schema.SchemaError>();
	const form = useAppForm({
		defaultValues,
		validators: { onChange: Schema.toStandardSchemaV1(schema) },
		onSubmit: async ({ value, formApi }) => {
			const result = await submit(Schema.decodeEffect(schema)(value).pipe(Effect.flatMap(request)));
			if (Exit.isFailure(result)) return;
			formApi.reset(resetAfterSuccess(value), { keepDefaultValues: true });
			onSuccess(result.value);
		},
	});
	return Object.assign(form, { requestAtom });
};
