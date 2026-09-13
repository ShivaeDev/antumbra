import type { ReactNode } from "react";
import { Label } from "#shadcn/label.tsx";

export const SettingsRow = ({
	control,
	help,
	htmlFor,
	label,
}: {
	readonly control: ReactNode;
	readonly help?: string | undefined;
	readonly htmlFor: string;
	readonly label: string;
}) => (
	<div className="grid grid-cols-[1fr_auto] items-center gap-x-6 py-3">
		<div className="min-w-0">
			<Label htmlFor={htmlFor}>{label}</Label>
			{help === undefined ? null : <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>}
		</div>
		<div className="justify-self-end">{control}</div>
	</div>
);
