import { LINES_CONTROL, TEXT_CONTROL } from "#classes.ts";

export interface Shown {
	readonly described: string | undefined;
	readonly invalid: boolean;
	readonly name: string;
	readonly onBlur: () => void;
	readonly onChange: (value: unknown) => void;
	readonly placeholder: string;
	readonly value: unknown;
}

export const worded = (value: unknown): string => (typeof value === "string" ? value : "");

const counted = (value: unknown): string => (typeof value === "number" ? String(value) : worded(value));

export const Words = (props: { readonly shown: Shown }) => (
	<input
		aria-describedby={props.shown.described}
		aria-invalid={props.shown.invalid}
		aria-label={props.shown.name}
		className={TEXT_CONTROL}
		onBlur={props.shown.onBlur}
		onChange={(event) => props.shown.onChange(event.target.value)}
		placeholder={props.shown.placeholder}
		value={worded(props.shown.value)}
	/>
);

export const Lines = (props: { readonly shown: Shown }) => (
	<textarea
		aria-describedby={props.shown.described}
		aria-invalid={props.shown.invalid}
		aria-label={props.shown.name}
		className={LINES_CONTROL}
		onBlur={props.shown.onBlur}
		onChange={(event) => props.shown.onChange(event.target.value)}
		placeholder={props.shown.placeholder}
		rows={3}
		value={worded(props.shown.value)}
	/>
);

export const Flag = (props: { readonly shown: Shown }) => (
	<input
		aria-describedby={props.shown.described}
		aria-invalid={props.shown.invalid}
		aria-label={props.shown.name}
		checked={props.shown.value === true}
		className="size-4 accent-primary"
		onBlur={props.shown.onBlur}
		onChange={(event) => props.shown.onChange(event.target.checked)}
		type="checkbox"
	/>
);

export const Digits = (props: { readonly shown: Shown }) => (
	<input
		aria-describedby={props.shown.described}
		aria-invalid={props.shown.invalid}
		aria-label={props.shown.name}
		className={TEXT_CONTROL}
		onBlur={props.shown.onBlur}
		onChange={(event) => props.shown.onChange(event.target.value === "" ? "" : Number(event.target.value))}
		placeholder={props.shown.placeholder}
		step={1}
		type="number"
		value={counted(props.shown.value)}
	/>
);
