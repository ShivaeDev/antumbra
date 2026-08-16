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
   ad hoc loses that identity.
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
