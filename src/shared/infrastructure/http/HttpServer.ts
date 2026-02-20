import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";

export interface HttpRoute {
  readonly method: string;
  readonly path: string;
  readonly handler: RouteHandler;
}

export interface HttpResponse {
  readonly statusCode: number;
  readonly body: unknown;
}

export type RouteParams = Record<string, string>;

export type RouteHandler = (requestBody: Record<string, unknown>, params: RouteParams) => Promise<HttpResponse>;

interface RouteMatch {
  readonly route: HttpRoute;
  readonly params: RouteParams;
}

export class HttpServer {
  private readonly routes: Array<HttpRoute> = [];
  private server: Server | undefined;

  public get(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "GET", path, handler });
  }

  public post(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "POST", path, handler });
  }

  public start(port: number): Promise<number> {
    return new Promise((resolve) => {
      this.server = createServer((request, response) => {
        this.handleRequest(request, response);
      });

      this.server.listen(port, () => {
        const address = this.server!.address();
        const assignedPort = typeof address === "object" && address !== null
          ? address.port
          : port;
        resolve(assignedPort);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server === undefined) {
        resolve();
        return;
      }

      this.server.close((error) => {
        this.server = undefined;
        if (error !== undefined && error !== null) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const match = this.matchRoute(request.method, request.url);

    if (match === undefined) {
      this.sendJson(response, 404, { error: "Not Found" });
      return;
    }

    this.readBody(request).then((body) => {
      return match.route.handler(body, match.params);
    }).then((result) => {
      this.sendJson(response, result.statusCode, result.body);
    }).catch((error: Error) => {
      this.sendJson(response, 500, { error: error.message });
    });
  }

  private matchRoute(method: string | undefined, url: string | undefined): RouteMatch | undefined {
    if (method === undefined || url === undefined) {
      return undefined;
    }

    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }

      const params = this.extractParams(route.path, url);
      if (params !== null) {
        return { route, params };
      }
    }

    return undefined;
  }

  private extractParams(routePath: string, requestUrl: string): RouteParams | null {
    const routeSegments = routePath.split("/");
    const urlSegments = requestUrl.split("/");

    if (routeSegments.length !== urlSegments.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let segmentIndex = 0; segmentIndex < routeSegments.length; segmentIndex++) {
      const routeSegment = routeSegments[segmentIndex]!;
      const urlSegment = urlSegments[segmentIndex]!;

      const isParam = routeSegment.startsWith(":");
      if (isParam) {
        const paramName = routeSegment.substring(1);
        params[paramName] = urlSegment;
      } else if (routeSegment !== urlSegment) {
        return null;
      }
    }

    return params;
  }

  private readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let data = "";

      request.on("data", (chunk: Buffer) => {
        data = data + chunk.toString();
      });

      request.on("end", () => {
        if (data.length === 0) {
          resolve({});
          return;
        }

        const parsed = JSON.parse(data) as Record<string, unknown>;
        resolve(parsed);
      });
    });
  }

  private sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  }
}
