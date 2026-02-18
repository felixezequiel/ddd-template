# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                    # Run all tests (node:test via SWC)
npm run test:watch          # Run tests in watch mode
npm run typecheck           # Type check only (tsc, no emit)
npm start                   # Run src/index.ts

# Run a single test file
node --import @swc-node/register/esm-register --test src/shared/domain/valueObjects/ValueObject.test.ts
```

## Architecture

DDD template using Hexagonal Architecture (Ports & Adapters) with TypeScript.

**Stack:** TypeScript 5.9 | Node.js 24 | node:test | ESM | SWC on-the-fly (no build step)

### Layer Structure

```
src/
├── shared/              # Shared kernel (base classes for all bounded contexts)
│   ├── domain/          # Identifier, ValueObject, Entity, AggregateRoot, DomainEvent
│   ├── application/     # UseCase interface, ApplicationService, DomainEventManager, UnitOfWork
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

**Dependency rule:** dependencies point inward — infrastructure → application → domain. Domain never imports from outer layers.

### Key Base Classes

- **Identifier** — UUID-based identity. Subclass for each domain ID (e.g., `UserId extends Identifier`).
- **ValueObject\<Props\>** — Immutable via `Object.defineProperty` with `writable: false`. Equality by value.
- **Entity\<Id, Props\>** — Has identity + props. Equality by ID.
- **AggregateRoot\<Id, Props\>** — Extends Entity. Collects domain events via `addDomainEvent()`, drained by ApplicationService.

### Application Orchestration

`ApplicationService` coordinates the full cycle: `begin()` → `execute()` → `dispatchAll()` (in-process) → `publishAll()` (external) → `commit()`. Automatic `rollback()` on error.

`UseCase.execute()` returns `UseCaseResult<T>` containing both the result and aggregates (for event draining).

### Command Factory Pattern

Commands use a private constructor + static `of()` factory that receives primitives and constructs VOs internally:

```typescript
CreateUserCommand.of(userId: string, name: string, email: string)
```

Adapters always call `Command.of()` — never construct VOs directly.

## TypeScript Constraints

- **Decorators** require SWC — `@swc-node/register/esm-register` transforms legacy TS decorators at runtime. They do NOT work with native Node.js type stripping.
- **`exactOptionalPropertyTypes: true`** — optional props need explicit `| undefined` in type declarations.
- **Generic constraints** — use `object` instead of `Record<string, unknown>` to accept TS interfaces.
- **ValueObject immutability** — `Object.defineProperty` enforces runtime immutability; `readonly` alone is compile-time only. Use `props!: Props` (definite assignment assertion) when set via `Object.defineProperty`.

## Test Conventions

- **Co-located:** `Foo.ts` + `Foo.test.ts` side by side in the same directory.
- **Integration tests** in `<module>/integrationTests/`.
- **Framework:** `node:test` (`describe`/`it`) + `node:assert/strict`.
- Fakes/spies use in-memory implementations (e.g., `InMemoryUserRepository`).
