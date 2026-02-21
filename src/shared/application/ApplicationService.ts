import type { DomainEvent } from "../domain/events/DomainEvent.ts";
import type { DomainEventEmitter } from "../domain/events/DomainEventEmitter.ts";
import type { UseCase } from "./UseCase.ts";
import type { UnitOfWork } from "./UnitOfWork.ts";
import type { DomainEventManager } from "./DomainEventManager.ts";
import type { EventPublisherPort } from "../ports/EventPublisherPort.ts";
import type { EventStorePort } from "../ports/EventStorePort.ts";

export class ApplicationService {
  private readonly unitOfWork: UnitOfWork;
  private readonly domainEventManager: DomainEventManager;
  private readonly eventPublisher: EventPublisherPort;
  private readonly eventStore: EventStorePort;

  constructor(
    unitOfWork: UnitOfWork,
    domainEventManager: DomainEventManager,
    eventPublisher: EventPublisherPort,
    eventStore: EventStorePort,
  ) {
    this.unitOfWork = unitOfWork;
    this.domainEventManager = domainEventManager;
    this.eventPublisher = eventPublisher;
    this.eventStore = eventStore;
  }

  public async execute<Command, Result>(
    useCase: UseCase<Command, Result>,
    command: Command,
  ): Promise<Result> {
    await this.unitOfWork.begin();

    try {
      const result: Result = await useCase.execute(command);

      const trackedSources = this.unitOfWork.getTrackedEventSources();
      const allEvents = this.drainEventsFromSources(trackedSources);

      await this.domainEventManager.dispatchAll(allEvents);

      await this.eventPublisher.publishAll(allEvents);

      await this.eventStore.saveAll(allEvents);

      await this.unitOfWork.commit();

      return result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  private drainEventsFromSources(
    sources: ReadonlyArray<DomainEventEmitter>,
  ): Array<DomainEvent> {
    const allEvents: Array<DomainEvent> = [];

    for (const source of sources) {
      const events = source.drainDomainEvents();
      for (const event of events) {
        allEvents.push(event);
      }
    }

    return allEvents;
  }
}
