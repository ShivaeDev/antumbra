import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "#forms/context.ts";
import { Field, SelectField, TextareaField, TextField } from "#forms/fields.tsx";
import { Form, Submit } from "#forms/form.tsx";

export const { useAppForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: { Field, SelectField, TextField, TextareaField },
	formComponents: { Form, Submit },
});
