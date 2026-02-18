import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApplicationService } from "./ApplicationService.ts";
import { DomainEventManager } from "./DomainEventManager.ts";
import type { UnitOfWork } from "./UnitOfWork.ts";
import type { UseCase, UseCaseResult } from "./UseCase.ts";
import type { EventPublisherPort } from "../ports/EventPublisherPort.ts";
import type { DomainEvent } from "../domain/events/DomainEvent.ts";
import { AggregateRoot } from "../domain/aggregates/AggregateRoot.ts";
import { Identifier } from "../domain/identifiers/Identifier.ts";

class FakeId extends Identifier {}

interface FakeProps {
  readonly name: string;
}

class FakeCreatedEvent implements DomainEvent {
  public readonly eventName = "FakeCreated";
  public readonly occurredAt: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
  }
}

class FakeAggregate extends AggregateRoot<FakeId, FakeProps> {
  public static create(id: FakeId, name: string): FakeAggregate {
    const aggregate = new FakeAggregate(id, { name });
    aggregate.addDomainEvent(new FakeCreatedEvent(id.value));
    return aggregate;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public beginCalled = false;
  public commitCalled = false;
  public rollbackCalled = false;

  public async begin(): Promise<void> {
    this.beginCalled = true;
  }

  public async commit(): Promise<void> {
    this.commitCalled = true;
  }

  public async rollback(): Promise<void> {
    this.rollbackCalled = true;
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public publishedEvents: Array<DomainEvent> = [];

  public async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  public async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      this.publishedEvents.push(event);
    }
  }
}

interface FakeCommand {
  readonly name: string;
}

class FakeUseCase implements UseCase<FakeCommand, FakeAggregate> {
  public async execute(command: FakeCommand): Promise<UseCaseResult<FakeAggregate>> {
    const aggregate = FakeAggregate.create(new FakeId("agg-1"), command.name);
    return { result: aggregate, aggregates: [aggregate] };
  }
}

class FailingUseCase implements UseCase<FakeCommand, FakeAggregate> {
  public async execute(): Promise<UseCaseResult<FakeAggregate>> {
    throw new Error("use case failed");
  }
}

describe("ApplicationService", () => {
  it("should execute the full cycle: begin, useCase, dispatch, publish, commit", async () => {
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const useCase = new FakeUseCase();
    const dispatchedEvents: Array<DomainEvent> = [];

    eventManager.register("FakeCreated", async (event) => {
      dispatchedEvents.push(event);
    });

    const applicationService = new ApplicationService(
      unitOfWork,
      eventManager,
      eventPublisher,
    );

    const result = await applicationService.execute(useCase, { name: "test" });

    assert.ok(unitOfWork.beginCalled);
    assert.ok(unitOfWork.commitCalled);
    assert.ok(!unitOfWork.rollbackCalled);
    assert.equal(result.id.value, "agg-1");
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(eventPublisher.publishedEvents.length, 1);
  });

  it("should rollback and re-throw when use case fails", async () => {
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const failingUseCase = new FailingUseCase();

    const applicationService = new ApplicationService(
      unitOfWork,
      eventManager,
      eventPublisher,
    );

    await assert.rejects(
      () => applicationService.execute(failingUseCase, { name: "test" }),
      { message: "use case failed" },
    );

    assert.ok(unitOfWork.beginCalled);
    assert.ok(!unitOfWork.commitCalled);
    assert.ok(unitOfWork.rollbackCalled);
  });

  it("should rollback when event dispatch fails", async () => {
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const useCase = new FakeUseCase();

    eventManager.register("FakeCreated", async () => {
      throw new Error("handler failed");
    });

    const applicationService = new ApplicationService(
      unitOfWork,
      eventManager,
      eventPublisher,
    );

    await assert.rejects(
      () => applicationService.execute(useCase, { name: "test" }),
      { message: "handler failed" },
    );

    assert.ok(unitOfWork.rollbackCalled);
    assert.ok(!unitOfWork.commitCalled);
  });

  it("should drain events from all aggregates returned by the use case", async () => {
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();

    class MultiAggregateUseCase implements UseCase<FakeCommand, FakeAggregate> {
      public async execute(command: FakeCommand): Promise<UseCaseResult<FakeAggregate>> {
        const firstAggregate = FakeAggregate.create(new FakeId("agg-1"), command.name);
        const secondAggregate = FakeAggregate.create(new FakeId("agg-2"), command.name);
        return { result: firstAggregate, aggregates: [firstAggregate, secondAggregate] };
      }
    }

    const applicationService = new ApplicationService(
      unitOfWork,
      eventManager,
      eventPublisher,
    );

    await applicationService.execute(new MultiAggregateUseCase(), { name: "test" });

    assert.equal(eventPublisher.publishedEvents.length, 2);
  });
});
