import { useChoices } from "@antumbra/glass-client/wiring.ts";
import { useField } from "@antumbra/glass-form/react.ts";
import type { Choice } from "@antumbra/platform-feature/edit.ts";
import { type ReactNode, useId } from "react";
import { inputOf, type Offer, offersOf } from "#choices.ts";
import { ALERT, CELL, TITLE } from "#classes.ts";
import { type Editable, type Held, titleOf } from "#fields.ts";
import type { Generated } from "#generated.ts";
import { Digits, Flag, Lines, type Shown, Words } from "#inputs.tsx";
import { Free, Listed, Several } from "#offered.tsx";

export interface Kit {
	readonly Digits: (props: { readonly shown: Shown }) => ReactNode;
	readonly Flag: (props: { readonly shown: Shown }) => ReactNode;
	readonly Lines: (props: { readonly shown: Shown }) => ReactNode;
	readonly Listed: (props: { readonly empty: boolean; readonly offers: readonly Offer[]; readonly shown: Shown }) => ReactNode;
	readonly Words: (props: { readonly shown: Shown }) => ReactNode;
}

export const ROW_KIT: Kit = { Digits, Flag, Lines, Listed, Words };

const literalOffers = (literals: readonly string[]): readonly Offer[] => literals.map((literal) => ({ label: literal, value: literal }));

const Chosen = (props: {
	readonly choice: Choice;
	readonly empty: boolean;
	readonly kit: Kit;
	readonly many: boolean;
	readonly shown: Shown;
	readonly values: Held;
}) => {
	const list = useId();
	const input = inputOf(props.choice, props.values);
	const listed = useChoices(input === undefined ? undefined : props.choice.query, input);
	const offers = offersOf(props.choice, listed);
	if (props.many) {
		return <Several offers={offers} shown={props.shown} />;
	}
	return props.choice.free ? (
		<Free list={list} offers={offers} shown={props.shown} />
	) : (
		<props.kit.Listed empty={props.empty} offers={offers} shown={props.shown} />
	);
};

export const drawnAs = (editable: Editable, shown: Shown, values: Held, kit: Kit): ReactNode => {
	const shape = editable.editing;
	if (shape.choice !== undefined) {
		return <Chosen choice={shape.choice} empty={shape.optional} kit={kit} many={shape.many} shown={shown} values={values} />;
	}
	if (shape.literals !== undefined) {
		return <kit.Listed empty={shape.optional} offers={literalOffers(shape.literals)} shown={shown} />;
	}
	if (shape.flag) {
		return <kit.Flag shown={shown} />;
	}
	if (shape.number) {
		return <kit.Digits shown={shown} />;
	}
	if (shape.multiline) {
		return <kit.Lines shown={shown} />;
	}
	return <kit.Words shown={shown} />;
};

export const Control = (props: {
	readonly caption: string | undefined;
	readonly change: (name: string, value: unknown) => void;
	readonly editable: Editable;
	readonly form: Generated;
	readonly label: string;
	readonly placeholder: string | undefined;
	readonly titles: boolean;
	readonly values: Held;
}) => {
	const named = useId();
	const said = useId();
	const field = useField(props.form, props.editable.name);
	const title = titleOf(props.editable);
	const shown: Shown = {
		described: field.error === undefined ? undefined : said,
		focus: false,
		invalid: field.error !== undefined,
		name: `${props.label} ${title}`.trim(),
		named,
		onBlur: field.onBlur,
		onChange: (value) => props.change(props.editable.name, value),
		placeholder: props.placeholder ?? "",
		value: field.value,
	};
	const caption = props.caption === undefined || field.value !== "" ? null : <p className={TITLE}>{props.caption}</p>;
	return (
		<div className={CELL}>
			{props.titles ? (
				<span aria-hidden="true" className={TITLE}>
					{title}
				</span>
			) : null}
			{drawnAs(props.editable, shown, props.values, ROW_KIT)}
			{field.error === undefined ? (
				caption
			) : (
				<p className={ALERT} id={said}>
					{field.error}
				</p>
			)}
		</div>
	);
};
