# Effect Services

Effect services are how runtime code states dependencies and where capability
boundaries own invariants. This gate covers the design judgment behind the
service-parameter lint rule.

## Rules

1. A function yields each service it needs and exposes that requirement in its
   Effect environment. Do not pass a service implementation, database handle,
   writer-shaped value, `Context`, or dependency bundle through an ordinary
   parameter.
2. Layers provide implementations and close environments at composition roots.
   A Layer is the lifetime and sharing boundary; reconstructing service objects
   ad hoc loses that identity. A service using the shared definition constructor
   declares its requirements once, initializes private state once, and derives
   its public methods and Layer from the same definition. Initializer state is
   never part of the public service shape. Methods are ordinary non-generic
   single-signature functions. The constructor rejects overload distinctions
   TypeScript preserves; redundant declarations erased to one structural
   signature are not observable to a type-level API.
3. A domain capability owns the whole business act: validation, transaction,
   durable writes, and notifications after commit. Its caller names the act and
   supplies only domain input.
4. Keep services small and composable. Give a capability its own package when
   that creates a real, named responsibility and a one-way dependency edge;
   do not create packages that exist only to hold an interface.
5. Close Effect requirements before a callback crosses into a foreign SDK. The
   domain compiles a provider callback by yielding its exact capabilities; the
   adapter receives an `R = never` callback and never carries a domain Context.
6. Adapters may accept constructed foreign values at their boundary, and tests
   may inject a narrow fake through a Layer. Neither exception permits service
   plumbing through production business functions. When touched legacy
   plumbing is removed, its active debt-baseline entry leaves with it.

## Detailed guides

- [Semantic ownership](effect-services/semantic-ownership.md) — keep database
  access and domain inference with the capability that answers the question;
  distinguish ownership inversion from valid filtering, relation loading, and
  consumer reshaping.

Quality feedback follows [Improving the gates](README.md#improving-the-gates):
clarify why, record the reason, and promote only reusable guidance or
mechanically provable rules.
