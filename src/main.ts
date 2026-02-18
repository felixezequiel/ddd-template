import { HttpServer } from "./shared/infrastructure/http/HttpServer.ts";
import { GraphqlServer } from "./shared/infrastructure/graphql/GraphqlServer.ts";
import { ApplicationService } from "./shared/application/ApplicationService.ts";
import { DomainEventManager } from "./shared/application/DomainEventManager.ts";
import { NoOpUnitOfWork } from "./shared/infrastructure/persistence/NoOpUnitOfWork.ts";
import { EventEmitterEventBus } from "./shared/infrastructure/events/EventEmitterEventBus.ts";
import { ConsoleLogger } from "./shared/infrastructure/logging/ConsoleLogger.ts";
import { UserModule } from "./modules/user/bootstrap/UserModule.ts";

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

  // --- Shared infrastructure (monolith provides these) ---
  const unitOfWork = new NoOpUnitOfWork();
  const domainEventManager = new DomainEventManager();
  const eventBus = new EventEmitterEventBus();
  const applicationService = new ApplicationService(unitOfWork, domainEventManager, eventBus);

  // --- Servers ---
  const httpServer = new HttpServer();
  const graphqlServer = new GraphqlServer();

  // --- Module registration (vertical slices) ---
  // Each module wires its own dependencies and registers adapters.
  // To add a new bounded context, create a new module and register it here.
  const userModule = new UserModule(applicationService);
  userModule.registerEventHandlers(eventBus, logger);
  userModule.registerRoutes(httpServer);
  userModule.registerResolvers(graphqlServer);

  // Future modules:
  // const orderModule = new OrderModule(applicationService);
  // orderModule.registerRoutes(httpServer);
  // orderModule.registerResolvers(graphqlServer);

  // Future adapters (same modules, different entry points):
  // userModule.registerConsumers(messageBroker);
  // userModule.registerCli(cliRouter);

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
