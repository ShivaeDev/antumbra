import { useField } from "@antumbra/atom-form/react.ts";
import type { Choice } from "@antumbra/feature/edit.ts";
import { useChoices } from "@antumbra/glass-client/wiring.ts";
import { type ReactNode, useId } from "react";
import { inputOf, type Offer, offersOf } from "#choices.ts";
import { ALERT, CELL, TITLE } from "#classes.ts";
import { type Editable, type Held, titleOf } from "#fields.ts";
import type { Generated } from "#generated.ts";
import { Digits, Flag, Free, Listed, type Shown, Words } from "#inputs.tsx";

const literalOffers = (literals: readonly string[]): readonly Offer[] => literals.map((literal) => ({ label: literal, value: literal }));

const Chosen = (props: { readonly choice: Choice; readonly empty: boolean; readonly shown: Shown; readonly values: Held }) => {
	const list = useId();
	const input = inputOf(props.choice, props.values);
	const listed = useChoices(input === undefined ? undefined : props.choice.query, input);
	const offers = offersOf(props.choice, listed);
	return props.choice.free ? (
		<Free list={list} offers={offers} shown={props.shown} />
	) : (
		<Listed empty={props.empty} offers={offers} shown={props.shown} />
	);
};

const drawnAs = (editable: Editable, shown: Shown, values: Held): ReactNode => {
	const shape = editable.editing;
	if (shape.choice !== undefined) {
		return <Chosen choice={shape.choice} empty={shape.optional} shown={shown} values={values} />;
	}
	if (shape.literals !== undefined) {
		return <Listed empty={shape.optional} offers={literalOffers(shape.literals)} shown={shown} />;
	}
	if (shape.flag) {
		return <Flag shown={shown} />;
	}
	if (shape.number) {
		return <Digits shown={shown} />;
	}
	return <Words shown={shown} />;
};

export const Control = (props: {
	readonly change: (name: string, value: unknown) => void;
	readonly editable: Editable;
	readonly form: Generated;
	readonly label: string;
	readonly placeholder: string | undefined;
	readonly titles: boolean;
	readonly values: Held;
}) => {
	const said = useId();
	const field = useField(props.form, props.editable.name);
	const title = titleOf(props.editable);
	const shown: Shown = {
		described: field.error === undefined ? undefined : said,
		invalid: field.error !== undefined,
		name: `${props.label} ${title}`.trim(),
		onBlur: field.onBlur,
		onChange: (value) => props.change(props.editable.name, value),
		placeholder: props.placeholder ?? "",
		value: field.value,
	};
	return (
		<div className={CELL}>
			{props.titles ? (
				<span aria-hidden="true" className={TITLE}>
					{title}
				</span>
			) : null}
			{drawnAs(props.editable, shown, props.values)}
			{field.error === undefined ? null : (
				<p className={ALERT} id={said}>
					{field.error}
				</p>
			)}
		</div>
	);
};
