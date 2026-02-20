import { MikroORM } from "@mikro-orm/sqlite";
import { HttpServer } from "./shared/infrastructure/http/HttpServer.ts";
import { GraphqlServer } from "./shared/infrastructure/graphql/GraphqlServer.ts";
import { ApplicationService } from "./shared/application/ApplicationService.ts";
import { DomainEventManager } from "./shared/application/DomainEventManager.ts";
import { EventEmitterEventBus } from "./shared/infrastructure/events/EventEmitterEventBus.ts";
import { ConsoleLogger } from "./shared/infrastructure/logging/ConsoleLogger.ts";
import { AggregateRoot } from "./shared/domain/aggregates/AggregateRoot.ts";
import { AggregateTracker } from "./shared/infrastructure/persistence/AggregateTracker.ts";
import { MikroOrmEntityManagerProvider } from "./shared/infrastructure/persistence/adapters/EntityManagerProvider.ts";
import { MikroOrmUnitOfWork } from "./shared/infrastructure/persistence/adapters/MikroOrmUnitOfWork.ts";
import { UserAggregatePersister } from "./modules/user/infrastructure/persistence/mikro-orm/repositories/user/UserAggregatePersister.ts";
import { MikroOrmUserRepository } from "./modules/user/infrastructure/persistence/mikro-orm/repositories/user/MikroOrmUserRepository.ts";
import { UserModule } from "./modules/user/bootstrap/UserModule.ts";
import mikroOrmConfig from "./mikro-orm.config.ts";

/**
 * Composition Root — Monolith entry point.
 *
 * Each module is a self-contained vertical slice:
 *   - Owns its domain, application, and infrastructure layers
 *   - Registers its own HTTP routes and GraphQL resolvers
 *   - Can be extracted to a standalone microservice by replacing
 *     this composition root with its own main + dedicated servers
 *
 * Shared infrastructure (UnitOfWork, EventPublisher, Logger) is provided
 * by the monolith and injected into each module's ApplicationService.
 *
 * Adding a new adapter (Broker, CLI) means adding a new
 * registerXxx() method to each module — the use cases remain unchanged.
 */

const REST_PORT = 3000;
const GRAPHQL_PORT = 4000;

async function main(): Promise<void> {
  const logger = new ConsoleLogger();

  // --- MikroORM initialization ---
  const orm = await MikroORM.init(mikroOrmConfig);
  const migrator = orm.getMigrator();
  await migrator.up();
  logger.info("Database migrations applied");

  // --- Auto-tracking: domain aggregates register themselves ---
  AggregateRoot.setOnTrack((aggregate) => {
    AggregateTracker.track(aggregate);
  });

  // --- Shared infrastructure (monolith provides these) ---
  const entityManagerProvider = new MikroOrmEntityManagerProvider(orm.em);
  const userAggregatePersister = new UserAggregatePersister();
  const unitOfWork = new MikroOrmUnitOfWork(entityManagerProvider, [userAggregatePersister]);
  const domainEventManager = new DomainEventManager();
  const eventBus = new EventEmitterEventBus();
  const applicationService = new ApplicationService(unitOfWork, domainEventManager, eventBus);

  // --- Servers ---
  const httpServer = new HttpServer();
  const graphqlServer = new GraphqlServer();

  // --- Module registration (vertical slices) ---
  // Each module wires its own dependencies and registers adapters.
  // To add a new bounded context, create a new module and register it here.
  const userRepository = new MikroOrmUserRepository(entityManagerProvider);
  const userModule = new UserModule(applicationService, userRepository);
  userModule.registerEventHandlers(eventBus, logger);
  userModule.registerRoutes(httpServer);
  userModule.registerResolvers(graphqlServer);

  // Future modules:
  // const orderModule = new OrderModule(applicationService, orderRepository);
  // orderModule.registerRoutes(httpServer);
  // orderModule.registerResolvers(graphqlServer);

  // --- Start ---
  const restPort = await httpServer.start(REST_PORT);
  const graphqlPort = await graphqlServer.start(GRAPHQL_PORT);

  logger.info("REST server started", { port: restPort, url: "http://localhost:" + restPort });
  logger.info("GraphQL server started", { port: graphqlPort, url: "http://localhost:" + graphqlPort + "/graphql" });
  logger.info("Available endpoints:", {
    "POST /users": "REST - Create a new user",
    "POST /graphql": "GraphQL - mutation createUser(input: CreateUserInput!)",
  });
}

main();
