import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "#forms/context.ts";
import { DatalistField } from "#forms/datalist.tsx";
import { Field, SelectField, TextareaField, TextField } from "#forms/fields.tsx";
import { Form, Submit } from "#forms/form.tsx";
import { NativeSelectField } from "#forms/native-select.tsx";

export const { useAppForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: { DatalistField, NativeSelectField, Field, SelectField, TextField, TextareaField },
	formComponents: { Form, Submit },
});
