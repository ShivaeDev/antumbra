import { useDirty, useSubmit } from "@antumbra/glass-form/react.ts";
import type { Generated } from "#generated.ts";
import { Button } from "#shadcn/button.tsx";

const SAVING = "Saving…";

export const SaveAction = ({ form }: { readonly form: Generated }) => {
	const dirty = useDirty(form);
	const submit = useSubmit(form);
	return (
		<Button className={dirty ? undefined : "invisible"} disabled={!dirty || submit.submitting} size="sm" type="submit" variant="ghost">
			{submit.submitting ? SAVING : "Save"}
		</Button>
	);
};
