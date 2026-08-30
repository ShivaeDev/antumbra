import { useEffect, useRef, useState } from "react";
import type { Unsubscribe } from "#adapters/trpc.ts";

export type Subscribe<M> = (onMessage: (message: M) => void, onError: (message: string) => void) => Unsubscribe;

export interface Feed<A> {
	readonly error: string | undefined;
	readonly value: A;
}

const useFold = <A, M>(key: string, subscribe: Subscribe<M>, seed: () => A, fold: (current: A, message: M) => A): Feed<A> => {
	const latest = useRef(subscribe);
	latest.current = subscribe;
	const [feed, setFeed] = useState<Feed<A>>(() => ({
		error: undefined,
		value: seed(),
	}));

	useEffect(() => {
		setFeed({ error: undefined, value: seed() });
		return latest.current(
			(message) =>
				setFeed((current) => ({
					error: current.error,
					value: fold(current.value, message),
				})),
			(message) => setFeed((current) => ({ error: message, value: current.value })),
		);
	}, [key, seed, fold]);

	return feed;
};

const nothingYet = (): undefined => undefined;

const replace = <A>(_current: A | undefined, message: A): A => message;

export const useFeed = <A>(key: string, subscribe: Subscribe<A>): Feed<A | undefined> =>
	useFold<A | undefined, A>(key, subscribe, nothingYet, replace);

const noEntries = (): ReadonlyArray<never> => [];

const append = <M>(current: ReadonlyArray<M>, message: M): ReadonlyArray<M> => [...current, message];

export const useFeedLog = <M>(key: string, subscribe: Subscribe<M>): Feed<ReadonlyArray<M>> =>
	useFold<ReadonlyArray<M>, M>(key, subscribe, noEntries, append);
