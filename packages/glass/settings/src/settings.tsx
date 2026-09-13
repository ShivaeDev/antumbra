import type { CountReading } from "@antumbra/domain-settings/queries/counts.ts";
import type { FlagReading } from "@antumbra/domain-settings/queries/flags.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@antumbra/glass-components/shadcn/card.tsx";
import type { ReactNode } from "react";
import { CountRow } from "#count-row.tsx";
import { FlagRow } from "#flag-row.tsx";
import type { SettingsApi } from "#glass.ts";
import { GROUPS, type Group } from "#groups.ts";

const WAITING = "Reading the fleet's settings…";

interface Readings {
	readonly counts: readonly (typeof CountReading.Type)[];
	readonly flags: readonly (typeof FlagReading.Type)[];
}

const rowOf = (api: SettingsApi, key: string, readings: Readings): ReactNode => {
	for (const flag of readings.flags) {
		if (flag.key === key) {
			return <FlagRow api={api} key={key} row={flag} />;
		}
	}
	for (const count of readings.counts) {
		if (count.key === key) {
			return <CountRow api={api} key={key} row={count} />;
		}
	}
	return null;
};

const SettingsGroup = (props: { readonly api: SettingsApi; readonly group: Group; readonly readings: Readings }) => (
	<Card className="max-w-[720px]">
		<CardHeader>
			<CardTitle className="text-sm font-medium">{props.group.title}</CardTitle>
			<CardDescription className="text-xs">{props.group.description}</CardDescription>
		</CardHeader>
		<CardContent className="divide-y">{props.group.keys.map((key) => rowOf(props.api, key, props.readings))}</CardContent>
	</Card>
);

export const Settings = ({ api }: { readonly api: SettingsApi }) => (
	<Live input={{}} query={api.settings.flags} waiting={WAITING}>
		{(flags) => (
			<Live input={{}} query={api.settings.counts} waiting={WAITING}>
				{(counts) => GROUPS.map((group) => <SettingsGroup api={api} group={group} key={group.title} readings={{ counts, flags }} />)}
			</Live>
		)}
	</Live>
);
