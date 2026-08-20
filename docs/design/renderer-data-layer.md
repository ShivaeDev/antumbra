# Renderer data layer

[Design guides](README.md) · [Architecture](../../ARCHITECTURE.md) ·
[Glossary](../../GLOSSARY.md)

The renderer holds no truth of its own. Every value it draws crosses the typed
bridge from the main process, and it arrives in one of two shapes: a **feed**
that pushes the current picture and keeps pushing, or a **call** that answers
once. This guide fixes the hooks that carry both shapes so a view spends its
lines on what it draws rather than on how the value reached it.

## Two shapes, three hooks

| Traffic | Hook | Result |
| --- | --- | --- |
| Feed replacing a snapshot | `useFeed` | latest snapshot, or nothing yet |
| Feed appending a log | `useFeedLog` | every message so far, in order |
| One answer: read or act | `useCall` | idle, pending, done, or failed |

Nothing else in a view may open a subscription or start a read. The `watch*`,
`read*`, and act functions in `packages/renderer/src/adapters/` stay exactly
as they are — they remain the only place that names a bridge procedure, and
the hooks are the only callers of them a view writes.

## Feeds

Both feed hooks take the same two arguments and return the same record.

```ts
useFeed<A>(key: string, subscribe: Subscribe<A>): Feed<A | undefined>
useFeedLog<M>(key: string, subscribe: Subscribe<M>): Feed<ReadonlyArray<M>>

type Subscribe<M> = (
	onMessage: (message: M) => void,
	onError: (message: string) => void,
) => Unsubscribe;

interface Feed<A> {
	readonly error: string | undefined;
	readonly value: A;
}
```

The **key** names what is being watched, and it is the whole lifecycle. While
it holds still the subscription holds still. When it changes the hook drops the
old subscription, throws the accumulated value away, and subscribes again with
the key's new meaning — which is exactly what a view wants when the reader
switches to another voyage or another session. A feed with no parameter passes
a literal (`"quay"`, `"fleet"`); a keyed feed passes the parameter itself.

The **subscribe** argument may be a fresh closure on every render. The hooks
read it through a ref, so a view never needs `useCallback` and a changed
closure never resubscribes on its own. Only the key does that.

`useFeed` replaces: each message is the new picture, and the previous one is
gone. That is the server's own contract — a feed opens with a full current
snapshot and re-emits the whole snapshot on every change, so a view that keeps
the old one is showing a picture nobody sent. `useFeedLog` appends: each
message is another entry, and `value` is every entry received under the current
key, in arrival order. Session events are the only appending feed today. A feed
that needs a third fold does not get a parameter for it; it gets a third named
hook beside these two, so the call site still says what it means.

## Calls

A one-shot read and a mutation are the same interaction — fire once, land or
fail — and they differ only in whether the answer carries a value. They get one
hook.

```ts
useCall<A>(): Caller<A>

type Call<A> = (
	onDone: (value: A) => void,
	onError: (message: string) => void,
) => void;

type CallState<A> =
	| { readonly _tag: "idle" }
	| { readonly _tag: "pending" }
	| { readonly _tag: "done"; readonly value: A }
	| { readonly _tag: "failed"; readonly message: string };

interface Caller<A> {
	readonly reset: () => void;
	readonly run: (call: Call<A>) => void;
	readonly state: CallState<A>;
}
```

`run` moves the state to pending and hands the adapter its two callbacks. A run
settles exactly once: the first answer wins, later callbacks from the same run
are dropped, and answers from a superseded run are dropped too. That is what
makes a second click safe — open one artifact, then another, and the reader
sees the second one whatever order the answers come back in. `reset` returns
the caller to idle and abandons whatever is in flight; it is how a view closes
a detail pane.

A mutation is a call whose answer carries nothing. It reaches `useCall` when
the view is ready to own the outcome — a button that disables itself while the
act is in flight reads `state._tag === "pending"`, and a view that shows its
own failure line reads the failed message. A view that instead hands failures
to the application notice keeps doing that by passing the parent's `onError`
straight into the adapter and letting `useCall` own only the pending flag.
Adopt the hook where it removes state, not everywhere a mutation is called.

## When a feed fails

A feed failure is terminal for that subscription. The hook records the message
in `error`, keeps the last value it received, and does not resubscribe. Views
already render this as a `feed lost: …` line over whatever was last shown, and
that stays the behavior.

There is no automatic retry, and adding one would be guesswork. The
subscription rides the bridge channel into the main process. If that process is
gone the renderer has nothing to retry against and the window is dead anyway;
if it is alive the error is a real stream failure that an immediate retry would
simply provoke again. The recovery levers are the ones a reader already has:
change the key, or reload the window — a feed opens with the current snapshot,
so a reload rehydrates without a second request.

The one honest improvement is out of the renderer's hands. When the bridge
carries a connection state, the feed hooks resubscribe when it returns to
connected, and `packages/renderer/src/hooks/feed.ts` is the only file that
changes.

## Atoms stay peripheral

`@effect/atom-react` stays where it is: process-lifetime constants that are read
once and never change. `appInfoAtom` is the whole population. Feeds and calls
use the hooks above.

Three reasons, and they are about lifetime rather than taste. Every feed except
app info is either scoped to a component by an identifier or has exactly one
subscriber in the whole tree, so the sharing an atom buys is sharing nothing
needs. Making the keyed feeds atoms means atom families, which move
subscription lifetime out of the component that opened it and into a global
registry no view can see — the opposite of the renderer being a projection with
nothing behind it. And the bridge hands out callback subscriptions, not
streams; turning them into atoms means writing stream adapters over an
unsubscribe function, machinery in service of nothing.

Revisit this when two independently mounted views need the same keyed feed at
the same time, or when a feed must outlive the component that opened it.
Neither is true today, and these hooks are the seam to swap behind when one
becomes true.

## Adopting a view

The conversion is mechanical and changes nothing a reader sees.

1. Find the `useState` pairs that hold a fed value and its feed error, and the
   `useEffect` that calls a `watch*` function.
2. Replace all of it with one line:
   `const { error, value } = useFeed(key, subscribe)`. Destructure to the names
   the view already uses so the markup below is untouched. Drop the manual
   reset of state at the top of the effect — the key does that now.
3. For an appending feed use `useFeedLog`, and keep the effects that react to
   the accumulated value, such as scrolling to the tail.
4. For a one-shot read, replace the loading/loaded/failed `useState` with
   `useCall` and derive the view's own detail type from `state` in one function
   with early returns. Leave that derivation in the view; lift it to a shared
   module when a second view needs the same one, not before.
5. Delete the now-unused `useEffect`/`useState` imports and run
   `pnpm ready`.

The worked examples live in `packages/renderer/src/views/`: `quay.tsx` for a
replacing feed, `transcript.tsx` for an appending one, and
`artifact-outcomes.tsx` for a one-shot read. Every remaining view follows them
without inventing anything new; a view that cannot be converted by these steps
has found a fourth traffic shape, and that belongs in this guide before it
belongs in code.
