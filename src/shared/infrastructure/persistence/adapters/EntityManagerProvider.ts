import type { EntityManager } from "@mikro-orm/core";

export interface EntityManagerProvider {
  getEntityManager(): EntityManager;
  setEntityManager(entityManager: EntityManager): void;
}

export class MikroOrmEntityManagerProvider implements EntityManagerProvider {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  public getEntityManager(): EntityManager {
    return this.entityManager;
  }

  public setEntityManager(entityManager: EntityManager): void {
    this.entityManager = entityManager;
  }
}
