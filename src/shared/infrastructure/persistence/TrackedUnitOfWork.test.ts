import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { TrackedUnitOfWork } from "./TrackedUnitOfWork.ts";
import { AggregateTracker } from "./AggregateTracker.ts";
import { AggregateRoot } from "../../domain/aggregates/AggregateRoot.ts";
import { Identifier } from "../../domain/identifiers/Identifier.ts";
import type { DomainEvent } from "../../domain/events/DomainEvent.ts";

class FakeId extends Identifier {}

interface FakeProps {
  readonly name: string;
}

class FakeCreatedEvent implements DomainEvent {
  public readonly eventName = "FakeCreated";
  public readonly occurredAt = new Date();
  public readonly aggregateId: string;

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
  }
}

class FakeAggregate extends AggregateRoot<FakeId, FakeProps> {
  public static create(id: FakeId, name: string): FakeAggregate {
    const aggregate = new FakeAggregate(id, { name });
    aggregate.addDomainEvent(new FakeCreatedEvent(id.value));
    return aggregate;
  }
}

class SpyUnitOfWork extends TrackedUnitOfWork {
  public onBeginCalled = false;
  public onCommitAggregates: ReadonlyArray<AggregateRoot<Identifier, object>> = [];
  public onRollbackCalled = false;

  protected async onBegin(): Promise<void> {
    this.onBeginCalled = true;
  }

  protected async onCommit(
    trackedAggregates: ReadonlyArray<AggregateRoot<Identifier, object>>,
  ): Promise<void> {
    this.onCommitAggregates = trackedAggregates;
  }

  protected async onRollback(): Promise<void> {
    this.onRollbackCalled = true;
  }
}

describe("TrackedUnitOfWork", () => {
  beforeEach(() => {
    AggregateRoot.setOnTrack((aggregate) => {
      AggregateTracker.track(aggregate);
    });
  });

  afterEach(() => {
    AggregateRoot.setOnTrack(null);
  });

  it("should call AggregateTracker.begin and then onBegin", async () => {
    const unitOfWork = new SpyUnitOfWork();

    await unitOfWork.begin();

    assert.ok(unitOfWork.onBeginCalled);

    const aggregate = FakeAggregate.create(new FakeId("agg-1"), "test");
    const peeked = AggregateTracker.peek();
    assert.equal(peeked.length, 1);
    assert.equal(peeked[0], aggregate);

    AggregateTracker.drain();
  });

  it("should drain tracked aggregates and pass them to onCommit", async () => {
    const unitOfWork = new SpyUnitOfWork();

    await unitOfWork.begin();

    const aggregate = FakeAggregate.create(new FakeId("agg-1"), "test");

    await unitOfWork.commit();

    assert.equal(unitOfWork.onCommitAggregates.length, 1);
    assert.equal(unitOfWork.onCommitAggregates[0], aggregate);
  });

  it("should clear the tracker and call onRollback", async () => {
    const unitOfWork = new SpyUnitOfWork();

    await unitOfWork.begin();

    FakeAggregate.create(new FakeId("agg-1"), "test");

    await unitOfWork.rollback();

    assert.ok(unitOfWork.onRollbackCalled);

    const drained = AggregateTracker.drain();
    assert.equal(drained.length, 0);
  });

  it("should return tracked aggregates via getTrackedAggregates", async () => {
    const unitOfWork = new SpyUnitOfWork();

    await unitOfWork.begin();

    const aggregate = FakeAggregate.create(new FakeId("agg-1"), "test");

    const tracked = unitOfWork.getTrackedAggregates();

    assert.equal(tracked.length, 1);
    assert.equal(tracked[0], aggregate);

    AggregateTracker.drain();
  });
});
