export interface Configuration {
    username?: string;
    password?: string;
    accessToken?: string | ((name?: string, scopes?: string[]) => string | Promise<string>);
    basePath?: string;
    fetchApi?: WindowOrWorkerGlobalScope['fetch'];
    middleware?: Middleware[];
    queryParamsStringify?: (params: any) => string;
}

export interface RequestOpts {
    path: string;
    method: string;
    headers: HTTPHeaders;
    query?: any;
    body?: any;
}

export type HTTPHeaders = { [key: string]: string };
export type InitOverrideFunction = (requestContext: { init: RequestInit, context: any }) => Promise<RequestInit>;

export class BaseAPI {
    protected configuration: Configuration;

    constructor(configuration?: Configuration) {
        this.configuration = configuration || {};
    }

    protected async request(context: RequestOpts, initOverrides?: RequestInit | InitOverrideFunction): Promise<Response> {
        const url = (this.configuration.basePath || '') + context.path;
        const init: RequestInit = {
            method: context.method,
            headers: context.headers,
            body: context.body ? JSON.stringify(context.body) : undefined,
        };
        return fetch(url, init);
    }
}

export class RequiredError extends Error {
    constructor(public field: string, msg?: string) {
        super(msg);
        this.name = "RequiredError";
    }
}

export interface ApiResponse<T> {
    raw: Response;
    value(): Promise<T>;
}

export class JSONApiResponse<T> implements ApiResponse<T> {
    constructor(public raw: Response, private transformer: (jsonValue: any) => T) {}

    async value(): Promise<T> {
        const json = await this.raw.json();
        return this.transformer(json);
    }
}

export interface Middleware {}
