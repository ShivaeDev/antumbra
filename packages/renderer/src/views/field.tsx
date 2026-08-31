import { type ReactNode, useId } from "react";

export const Field = ({ children, label }: { readonly children: React.ReactNode; readonly label: string }) => (
	<div className="flex min-w-0 flex-col gap-1">
		<span className="text-2xs text-muted-foreground">{label}</span>
		{children}
	</div>
);

export const LabelledField = ({ children, label }: { readonly children: (id: string) => ReactNode; readonly label: string }) => {
	const id = useId();
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<label className="text-2xs text-muted-foreground" htmlFor={id}>
				{label}
			</label>
			{children(id)}
		</div>
	);
};
