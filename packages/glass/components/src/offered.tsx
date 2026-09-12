import type { Offer } from "#choices.ts";
import { CONTROL, LIST_CONTROL, TEXT_CONTROL } from "#classes.ts";
import { type Shown, worded } from "#inputs.tsx";

const ROWS = 4;

const picked = (control: HTMLSelectElement): readonly string[] => {
	const values: string[] = [];
	for (const option of control.options) {
		if (option.selected) {
			values.push(option.value);
		}
	}
	return values;
};

const selected = (value: unknown): readonly string[] => {
	const words: string[] = [];
	for (const held of Array.isArray(value) ? value : []) {
		if (typeof held === "string") {
			words.push(held);
		}
	}
	return words;
};

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

export const Several = (props: { readonly offers: readonly Offer[]; readonly shown: Shown }) => (
	<select
		aria-describedby={props.shown.described}
		aria-invalid={props.shown.invalid}
		aria-label={props.shown.name}
		className={LIST_CONTROL}
		multiple
		onBlur={props.shown.onBlur}
		onChange={(event) => props.shown.onChange(picked(event.target))}
		size={Math.min(props.offers.length, ROWS)}
		value={selected(props.shown.value)}
	>
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
