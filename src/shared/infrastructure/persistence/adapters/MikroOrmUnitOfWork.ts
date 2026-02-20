import type { AggregateRoot } from "../../../domain/aggregates/AggregateRoot.ts";
import type { Identifier } from "../../../domain/identifiers/Identifier.ts";
import type { AggregatePersister } from "../AggregatePersister.ts";
import type { EntityManagerProvider } from "./EntityManagerProvider.ts";
import { TrackedUnitOfWork } from "../TrackedUnitOfWork.ts";

export class MikroOrmUnitOfWork extends TrackedUnitOfWork {
  private readonly entityManagerProvider: EntityManagerProvider;
  private readonly persisters: ReadonlyArray<AggregatePersister>;

  constructor(
    entityManagerProvider: EntityManagerProvider,
    persisters: ReadonlyArray<AggregatePersister>,
  ) {
    super();
    this.entityManagerProvider = entityManagerProvider;
    this.persisters = persisters;
  }

  protected async onBegin(): Promise<void> {
    const currentEntityManager = this.entityManagerProvider.getEntityManager();
    const forkedEntityManager = currentEntityManager.fork();
    this.entityManagerProvider.setEntityManager(forkedEntityManager);
  }

  protected async onCommit(
    trackedAggregates: ReadonlyArray<AggregateRoot<Identifier, object>>,
  ): Promise<void> {
    const entityManager = this.entityManagerProvider.getEntityManager();

    for (const aggregate of trackedAggregates) {
      for (const persister of this.persisters) {
        if (persister.supports(aggregate)) {
          persister.persist(aggregate, entityManager);
          break;
        }
      }
    }

    await entityManager.flush();
  }

  protected async onRollback(): Promise<void> {
    const entityManager = this.entityManagerProvider.getEntityManager();
    entityManager.clear();
  }
}
