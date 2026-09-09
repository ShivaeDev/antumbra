import { useSubmit } from "@antumbra/atom-form/react.ts";
import type { AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { Cause, Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { SAVE } from "#controls.ts";
import { RoleFields } from "#fields.tsx";
import type { SettingsForm } from "#form.ts";
import { type BackendModels, type RolePlaceholder, roleLabel } from "#shape.ts";

const SAID = "The role settings could not be saved";

const messageOf = (cause: Cause.Cause<unknown>): string => {
	const error = Cause.findErrorOption(cause);
	return Option.isSome(error) && error.value instanceof Error && error.value.message !== "" ? error.value.message : SAID;
};

export const RoleBoard = (props: {
	readonly backends: readonly BackendModels[];
	readonly changed: readonly AgentRole[];
	readonly form: SettingsForm;
	readonly inheritLabel: string | null;
	readonly placeholderOf: (role: AgentRole) => RolePlaceholder;
	readonly roles: readonly AgentRole[];
}) => {
	const submit = useSubmit(props.form);
	const settled = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	return (
		<>
			<div className="grid min-w-0 grid-cols-[auto_7rem_1fr_6rem] items-center gap-x-2 gap-y-1">
				<span />
				<span className="text-2xs text-muted-foreground">Backend</span>
				<span className="text-2xs text-muted-foreground">Model</span>
				<span className="text-2xs text-muted-foreground">Effort</span>
				{props.roles.map((role) => (
					<RoleFields
						backends={props.backends}
						form={props.form}
						inheritLabel={props.inheritLabel}
						key={role}
						label={roleLabel[role]}
						placeholder={props.placeholderOf(role)}
						role={role}
					/>
				))}
				{props.backends.length === 0 ? <p className="col-span-full text-2xs text-muted-foreground">No backend is registered.</p> : null}
			</div>
			<div className="flex justify-end">
				<button className={SAVE} disabled={props.changed.length === 0 || submit.submitting} onClick={submit.run} type="button">
					{submit.submitting ? "Saving…" : "Save"}
				</button>
			</div>
			{settled === null ? null : (
				<p className="text-2xs text-destructive" role="alert">
					{settled}
				</p>
			)}
		</>
	);
};
