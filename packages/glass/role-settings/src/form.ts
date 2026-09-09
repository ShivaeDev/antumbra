import * as Form from "@antumbra/atom-form/form.ts";
import type { AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Layer } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useEffect, useRef, useState } from "react";
import { changedRoles, chosenOf, draftAt, valuesOf } from "#drafts.ts";
import type { Choose } from "#glass.ts";
import { type Stored, settingsSchema } from "#shape.ts";

const runtime = Atom.runtime(Layer.empty);

export interface Board {
	readonly roles: readonly AgentRole[];
	readonly rows: readonly Stored[];
	readonly scope: string;
	readonly send: Choose;
}

export const useSettingsForm = (board: Board) => {
	const latest = useRef(board.rows);
	useEffect(() => {
		latest.current = board.rows;
	}, [board.rows]);
	const [form] = useState(() =>
		Form.make(settingsSchema, {
			initialValues: valuesOf(board.rows),
			onSubmit: (values) =>
				Effect.forEach(
					changedRoles(board.roles, values, latest.current),
					(role) => board.send({ ...chosenOf(draftAt(values, role)), role, scope: board.scope }),
					{ discard: true },
				),
			runtime,
		}),
	);
	return form;
};

export type SettingsForm = ReturnType<typeof useSettingsForm>;
