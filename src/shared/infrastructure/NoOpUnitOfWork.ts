import type { UnitOfWork } from "../application/UnitOfWork.ts";

export class NoOpUnitOfWork implements UnitOfWork {
  public async begin(): Promise<void> {}
  public async commit(): Promise<void> {}
  public async rollback(): Promise<void> {}
}
