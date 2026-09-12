import { ALERT, ROW, SAVE } from "@antumbra/glass-components/classes.ts";
import { Control } from "@antumbra/glass-components/controls.tsx";
import { editablesOf } from "@antumbra/glass-components/fields.ts";
import { sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId } from "react";
import type { ReposApi } from "#glass.ts";

const INITIAL = { source: "", defaultRef: "main" };
const IDENTITY = {};
const PLACEHOLDERS: Readonly<Record<string, string>> = { source: "path or url", defaultRef: "main" };

export const AddRepo = (props: { readonly api: ReposApi }) => {
	const name = useId();
	const editables = editablesOf(props.api.repos.register.command, []);
	const form = useGenerated(editables, IDENTITY, INITIAL, sending(props.api.repos.register), () => form.change("source", ""));
	const values = useAtomRef(form.values);
	const submit = useSubmit(form);
	const ready = values.source !== "" && values.defaultRef !== "";
	const failure = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	return (
		<form
			aria-labelledby={name}
			className={ROW}
			onSubmit={(event) => {
				event.preventDefault();
				if (ready && !submit.submitting) {
					submit.run();
				}
			}}
		>
			<span className="sr-only" id={name}>
				Add repository
			</span>
			{editables.map((editable) => (
				<Control
					change={form.change}
					editable={editable}
					form={form}
					key={editable.name}
					label="Add repository"
					placeholder={PLACEHOLDERS[editable.name]}
					titles
					values={values}
				/>
			))}
			<button className={SAVE} disabled={!ready || submit.submitting} type="submit">
				{submit.submitting ? "Adding…" : "Add"}
			</button>
			{failure === null ? null : (
				<p className={ALERT} role="alert">
					{failure}
				</p>
			)}
		</form>
	);
};
