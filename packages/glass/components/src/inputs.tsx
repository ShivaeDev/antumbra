import type { Offer } from "#choices.ts";
import { CONTROL, TEXT_CONTROL } from "#classes.ts";

export interface Shown {
	readonly described: string | undefined;
	readonly invalid: boolean;
	readonly name: string;
	readonly onBlur: () => void;
	readonly onChange: (value: unknown) => void;
	readonly placeholder: string;
	readonly value: unknown;
}

const worded = (value: unknown): string => (typeof value === "string" ? value : "");

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

export const Listed = (props: { readonly empty: boolean; readonly offers: readonly Offer[]; readonly shown: Shown }) => (
	<select
		aria-describedby={props.shown.described}
		aria-invalid={props.shown.invalid}
		aria-label={props.shown.name}
		className={CONTROL}
		onBlur={props.shown.onBlur}
		onChange={(event) => props.shown.onChange(event.target.value)}
		value={worded(props.shown.value)}
	>
		{props.empty ? <option value="">{props.shown.placeholder}</option> : null}
		{props.offers.map((offer) => (
			<option key={offer.value} value={offer.value}>
				{offer.label}
			</option>
		))}
	</select>
);

export const Free = (props: { readonly list: string; readonly offers: readonly Offer[]; readonly shown: Shown }) => (
	<>
		<input
			aria-describedby={props.shown.described}
			aria-invalid={props.shown.invalid}
			aria-label={props.shown.name}
			className={TEXT_CONTROL}
			list={props.list}
			onBlur={props.shown.onBlur}
			onChange={(event) => props.shown.onChange(event.target.value)}
			placeholder={props.shown.placeholder}
			value={worded(props.shown.value)}
		/>
		<datalist id={props.list}>
			{props.offers.map((offer) => (
				<option key={offer.value} value={offer.value}>
					{offer.label}
				</option>
			))}
		</datalist>
	</>
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
