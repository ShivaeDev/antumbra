import { DialogForm } from "@antumbra/glass-components/dialog-form.tsx";
import { editablesOf } from "@antumbra/glass-components/fields.ts";
import { sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { useMemo } from "react";
import type { ReposApi } from "#glass.ts";

const INITIAL = { defaultRef: "main", source: "" };
const IDENTITY = {};
const PLACEHOLDERS: Readonly<Record<string, string>> = { defaultRef: "main", source: "Path or URL" };

export const AddRepo = ({ api }: { readonly api: ReposApi }) => {
	const editables = useMemo(() => editablesOf(api.repos.register.command, []), [api]);
	const send = useMemo(() => sending(api.repos.register), [api]);
	const form = useGenerated(editables, IDENTITY, INITIAL, send, () => form.change("source", ""));
	return <DialogForm cancel={false} editables={editables} form={form} placeholders={PLACEHOLDERS} submit="Add" />;
};
