# DDD Template

DDD template with Hexagonal Architecture (Ports & Adapters) in TypeScript.

## Stack

- **TypeScript 5.9** with strict mode
- **Node.js 24** with native test runner (`node:test`)
- **SWC** on-the-fly transpilation (no build step)
- **ESM** modules

## Architecture

```
src/
├── shared/              # Shared kernel (base classes for all bounded contexts)
│   ├── domain/          # Identifier, ValueObject, Entity, AggregateRoot, DomainEvent
│   ├── application/     # UseCase, ApplicationService, DomainEventManager, UnitOfWork
│   ├── ports/           # RepositoryPort, EventPublisherPort, LoggerPort
│   └── infrastructure/  # ConsoleLogger, LoggerRegistry, @log decorator
│
├── modules/<context>/   # Bounded contexts
│   ├── domain/          # Identifiers, ValueObjects, Aggregates, Events
│   ├── application/     # Commands, Ports (primary/secondary), UseCases
│   └── infrastructure/  # Adapters (persistence, etc.)
│
└── context/docs/        # Architecture Decision Records (ADRs)
```

Dependencies point inward: infrastructure -> application -> domain. Domain never imports from outer layers.

## Building Blocks

| Pattern | Description |
|---------|-------------|
| **Identifier** | UUID-based identity. Subclass for each domain ID (e.g. `UserId extends Identifier`) |
| **ValueObject\<Props\>** | Immutable via `Object.defineProperty`. Equality by value |
| **Entity\<Id, Props\>** | Has identity + props. Equality by ID |
| **AggregateRoot\<Id, Props\>** | Extends Entity. Collects domain events via `addDomainEvent()` |
| **DomainEvent** | Immutable fact that happened in the domain |
| **UseCase** | Returns `UseCaseResult<T>` containing result + aggregates |
| **ApplicationService** | Orchestrates: begin -> execute -> dispatch -> publish -> commit |
| **Command** | Private constructor + static `of()` factory receiving primitives |

## Getting Started

```bash
npm install
```

## Commands

```bash
npm test              # Run all tests (88 tests)
npm run test:watch    # Run tests in watch mode
npm run typecheck     # Type check (tsc, no emit)
npm start             # Run src/index.ts
```

## Example: User Bounded Context

The template includes a complete `User` bounded context as reference:

```
src/modules/user/
├── domain/
│   ├── aggregates/     # User (AggregateRoot)
│   ├── identifiers/    # UserId
│   ├── valueObjects/   # Email
│   └── events/         # UserCreatedEvent
├── application/
│   ├── command/        # CreateUserCommand (with of() factory)
│   ├── port/
│   │   ├── primary/    # CreateUserPort
│   │   └── secondary/  # UserRepositoryPort
│   └── usecase/        # CreateUserUseCase
├── infrastructure/
│   └── persistence/    # InMemoryUserRepository
└── integrationTests/   # Full cycle integration tests
```

## Test Conventions

- Co-located: `Foo.ts` + `Foo.test.ts` side by side
- Integration tests in `<module>/integrationTests/`
- Framework: `node:test` (`describe`/`it`) + `node:assert/strict`
- Fakes/spies use in-memory implementations

## ADRs

Architecture Decision Records are in `src/context/docs/`:

- [001 - Native Type Stripping](src/context/docs/001-native-type-stripping.md)
- [002 - TC39 Decorators](src/context/docs/002-tc39-decorators.md)
- [003 - Domain Event Dispatch](src/context/docs/003-domain-event-dispatch.md)
- [004 - Unit of Work Pattern](src/context/docs/004-unit-of-work-pattern.md)
- [005 - Application Service Orchestration](src/context/docs/005-application-service-orchestration.md)

## License

ISC