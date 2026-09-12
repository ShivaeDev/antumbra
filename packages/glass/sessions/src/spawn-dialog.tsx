import { Spawn } from "@antumbra/domain-starts/commands/submit.ts";
import { type Editable, valuesOf } from "@antumbra/glass-components/fields.ts";
import { Row } from "@antumbra/glass-components/row.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { editing } from "@antumbra/platform-feature/edit.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import { useMemo, useState } from "react";
import type { SessionsClient } from "#client.ts";

const editables: readonly Editable[] = Object.entries(Spawn.fields).flatMap(([name, schema]) => {
	const shape = editing(schema);
	return shape.title === undefined ? [] : [{ name, editing: shape }];
});
const blank = valuesOf(editables, {});

export const SpawnDialog = ({ sessions }: { readonly sessions: SessionsClient }) => {
	const [open, setOpen] = useState(false);
	const [revision, setRevision] = useState(0);
	const send = useMemo(
		() => (value: Readonly<Record<string, unknown>>) =>
			Effect.gen(function* () {
				const input = yield* Schema.decodeUnknownEffect(Spawn)({ ...value, requestId: Request.make(crypto.randomUUID()) });
				yield* sessions["starts.spawn"](input);
				return 0;
			}),
		[sessions],
	);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>Spawn agent</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Spawn an agent</DialogTitle>
					<DialogDescription>A role to answer for and a charter to work from, on one of the backends this host registered.</DialogDescription>
				</DialogHeader>
				<Row
					key={revision}
					creating
					description={undefined}
					editables={editables}
					identity={{}}
					known={{}}
					label="Spawn agent"
					placeholders={{ role: "navigator", charter: "what this agent is for" }}
					send={send}
					sent={() => {
						setOpen(false);
						setRevision((value) => value + 1);
					}}
					submit="Spawn"
					titles
					values={blank}
				/>
			</DialogContent>
		</Dialog>
	);
};
