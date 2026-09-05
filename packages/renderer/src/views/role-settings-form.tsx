import type { AgentSettingsChoice } from "@antumbra/contract";
import { useState } from "react";
import { Button } from "#components/ui/button.tsx";
import { chosenOf, draftOf, type RoleDraft, type RoleLine, sameSettings, signatureOf } from "#views/role-settings.ts";
import { RoleSettingsFields } from "#views/role-settings-fields.tsx";

export interface RoleChange<Role extends string> {
	readonly role: Role;
	readonly settings: AgentSettingsChoice;
}

const draftsOf = (lines: ReadonlyArray<RoleLine<string>>): Record<string, RoleDraft> =>
	Object.fromEntries(lines.map((line) => [line.role, draftOf(line.settings)]));

const changesOf = <Role extends string>(lines: ReadonlyArray<RoleLine<Role>>, drafts: Record<string, RoleDraft>): ReadonlyArray<RoleChange<Role>> =>
	lines.flatMap((line) => {
		const settings = chosenOf(drafts[line.role] ?? draftOf(line.settings));
		return sameSettings(settings, line.settings) ? [] : [{ role: line.role, settings }];
	});

export const RoleSettingsForm = <Role extends string>({
	backends,
	inheritLabel,
	lines,
	onSave,
	saveLabel,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly inheritLabel: string | null;
	readonly lines: ReadonlyArray<RoleLine<Role>>;
	readonly onSave: (changes: ReadonlyArray<RoleChange<Role>>) => void;
	readonly saveLabel: string;
}) => {
	const signature = signatureOf(lines);
	const [drafts, setDrafts] = useState(() => draftsOf(lines));
	const [seen, setSeen] = useState(signature);
	if (seen !== signature) {
		setSeen(signature);
		setDrafts(draftsOf(lines));
	}
	const changes = changesOf(lines, drafts);
	return (
		<form
			className="flex min-w-0 flex-col gap-2"
			onSubmit={(event) => {
				event.preventDefault();
				onSave(changes);
			}}
		>
			<RoleSettingsFields
				backends={backends}
				drafts={drafts}
				inheritLabel={inheritLabel}
				lines={lines}
				onChange={(role, draft) => setDrafts({ ...drafts, [role]: draft })}
			/>
			<div className="flex justify-end">
				<Button disabled={changes.length === 0} size="sm" type="submit" variant="outline">
					{saveLabel}
				</Button>
			</div>
		</form>
	);
};
