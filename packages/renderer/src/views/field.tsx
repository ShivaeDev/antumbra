import { type ReactNode, useId } from "react";

// why: a field's label is a caption above its control rather than a label
// element wrapping it, because some of the controls here are composed widgets
// that already own the click a label would steal.
export const Field = ({
	children,
	label,
}: {
	readonly children: React.ReactNode;
	readonly label: string;
}) => (
	<div className="flex min-w-0 flex-col gap-1">
		<span className="text-2xs text-muted-foreground">{label}</span>
		{children}
	</div>
);

// why: a plain control can be pointed at, so it is — the field hands down the
// id its label names and a screen reader gets the tie a caption cannot make.
// A composed widget still takes the caption above, which is what `Field` is.
export const LabelledField = ({
	children,
	label,
}: {
	readonly children: (id: string) => ReactNode;
	readonly label: string;
}) => {
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
