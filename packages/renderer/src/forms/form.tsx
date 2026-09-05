import { useStore } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { Button } from "#components/ui/button.tsx";
import { useFormContext } from "#forms/context.ts";
import { errorMessage } from "#forms/messages.ts";

export const Form = ({ children }: { readonly children: ReactNode }) => {
	const form = useFormContext();
	const busy = useStore(form.store, (state) => state.isSubmitting);
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
				{children}
				<ValidationErrors />
			</fieldset>
		</form>
	);
};

const ValidationErrors = () => {
	const form = useFormContext();
	const errors = useStore(form.store, (state) => state.errors);
	return errors.length > 0 ? (
		<p role="alert" className="text-2xs text-destructive">
			{errors.map(errorMessage).join(". ")}
		</p>
	) : null;
};

export const Submit = ({ children, pending }: { readonly children: ReactNode; readonly pending: string }) => {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
			{([canSubmit, busy]) => (
				<Button disabled={!canSubmit || busy} type="submit">
					{busy ? pending : children}
				</Button>
			)}
		</form.Subscribe>
	);
};
