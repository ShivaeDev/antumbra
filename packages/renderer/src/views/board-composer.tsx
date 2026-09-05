import type { BoardTarget } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { writeBoard } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { useFieldContext } from "#forms/context.ts";
import { RequestForm } from "#forms/view.tsx";
import { boardRegisterLabel } from "#voyages/labels.ts";

const schema = Schema.Struct({ body: Schema.NonEmptyString, register: Schema.Literals(["smooth", "rough"]) });
const emptyDraft: typeof schema.Type = { body: "", register: "smooth" };

const RegisterField = () => {
	const field = useFieldContext<typeof schema.Type.register>();
	const register = useStore(field.store, (state) => state.value);
	return (
		<fieldset className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
			<legend className="sr-only">Register</legend>
			{schema.fields.register.literals.map((choice) => (
				<Button
					aria-pressed={register === choice}
					key={choice}
					onClick={() => field.handleChange(choice)}
					size="sm"
					type="button"
					variant={register === choice ? "secondary" : "ghost"}
				>
					{boardRegisterLabel[choice]}
				</Button>
			))}
		</fieldset>
	);
};

export const BoardComposer = ({ scope }: { readonly scope: BoardTarget }) => {
	const form = useRequestForm({
		defaultValues: emptyDraft,
		schema,
		request: (value) => writeBoard({ ...value, scope }),
		resetAfterSuccess: (value) => ({ ...value, body: "" }),
		onSuccess: () => undefined,
	});
	const empty = useStore(form.store, (state) => state.values.body === "");
	return (
		<RequestForm form={form}>
			<form.AppField name="body">{(field) => <field.TextareaField label="Write to the board" rows={2} />}</form.AppField>
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<form.AppField name="register">{() => <RegisterField />}</form.AppField>
				<form.Submit disabled={empty} className="ml-auto" pending="Writing…" size="sm">
					Write
				</form.Submit>
			</div>
		</RequestForm>
	);
};
