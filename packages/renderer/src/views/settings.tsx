import {
	MAX_MAX_PARALLEL_SESSIONS,
	MIN_MAX_PARALLEL_SESSIONS,
} from "@antumbra/contract";
import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "#adapters/trpc-settings.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";

export const SettingsPanel = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [value, setValue] = useState("");
	const [saved, setSaved] = useState(false);
	const parsed = Number(value);
	const valid =
		Number.isInteger(parsed) &&
		parsed >= MIN_MAX_PARALLEL_SESSIONS &&
		parsed <= MAX_MAX_PARALLEL_SESSIONS;
	let feedback = "No restart required.";
	if (!valid) {
		feedback = `Enter a whole number from ${MIN_MAX_PARALLEL_SESSIONS} to ${MAX_MAX_PARALLEL_SESSIONS}.`;
	} else if (saved) {
		feedback = "Saved. New launches use this limit immediately.";
	}

	useEffect(() => {
		loadSettings(
			(settings) => setValue(String(settings.maxParallelSessions)),
			onError,
		);
	}, [onError]);
	const save = () =>
		saveSettings(
			{ maxParallelSessions: parsed },
			(settings) => {
				setValue(String(settings.maxParallelSessions));
				setSaved(true);
			},
			onError,
		);

	return (
		<section className="flex max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-8">
			<header>
				<h2 className="text-lg font-medium">Settings</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Changes apply to subsequent session launches. Running sessions are not
					interrupted.
				</p>
			</header>
			<div className="flex flex-col gap-3 rounded-md border border-border p-4">
				<label className="text-sm font-medium" htmlFor="max-parallel-sessions">
					Maximum parallel sessions
				</label>
				<p className="text-xs text-muted-foreground">
					Allow between {MIN_MAX_PARALLEL_SESSIONS} and{" "}
					{MAX_MAX_PARALLEL_SESSIONS} sessions to run at once.
				</p>
				<div className="flex items-center gap-2">
					<Input
						aria-describedby="max-parallel-sessions-feedback"
						className="w-28"
						id="max-parallel-sessions"
						max={MAX_MAX_PARALLEL_SESSIONS}
						min={MIN_MAX_PARALLEL_SESSIONS}
						onChange={(event) => {
							setSaved(false);
							setValue(event.target.value);
						}}
						step={1}
						type="number"
						value={value}
					/>
					<Button disabled={!valid} onClick={save}>
						Save
					</Button>
				</div>
				<p className="text-xs" id="max-parallel-sessions-feedback">
					{feedback}
				</p>
			</div>
		</section>
	);
};
