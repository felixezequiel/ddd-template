import type { DomainEvent } from "../domain/events/DomainEvent.ts";
import type { AggregateRoot } from "../domain/aggregates/AggregateRoot.ts";
import type { Identifier } from "../domain/identifiers/Identifier.ts";
import type { UseCase, UseCaseResult } from "./UseCase.ts";
import type { UnitOfWork } from "./UnitOfWork.ts";
import type { DomainEventManager } from "./DomainEventManager.ts";
import type { EventPublisherPort } from "../ports/EventPublisherPort.ts";

export class ApplicationService {
  private readonly unitOfWork: UnitOfWork;
  private readonly domainEventManager: DomainEventManager;
  private readonly eventPublisher: EventPublisherPort;

  constructor(
    unitOfWork: UnitOfWork,
    domainEventManager: DomainEventManager,
    eventPublisher: EventPublisherPort,
  ) {
    this.unitOfWork = unitOfWork;
    this.domainEventManager = domainEventManager;
    this.eventPublisher = eventPublisher;
  }

  public async execute<Command, Result>(
    useCase: UseCase<Command, Result>,
    command: Command,
  ): Promise<Result> {
    await this.unitOfWork.begin();

    try {
      const useCaseResult: UseCaseResult<Result> = await useCase.execute(command);

      const allEvents = this.drainEventsFromAggregates(useCaseResult.aggregates);

      await this.domainEventManager.dispatchAll(allEvents);

      await this.eventPublisher.publishAll(allEvents);

      await this.unitOfWork.commit();

      return useCaseResult.result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  private drainEventsFromAggregates(
    aggregates: ReadonlyArray<AggregateRoot<Identifier, object>>,
  ): Array<DomainEvent> {
    const allEvents: Array<DomainEvent> = [];

    for (const aggregate of aggregates) {
      const events = aggregate.drainDomainEvents();
      for (const event of events) {
        allEvents.push(event);
      }
    }

    return allEvents;
  }
}
