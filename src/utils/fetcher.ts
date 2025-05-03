import type {
  Endpoints,
  ExtractParams,
  GetEndpointPathsFrom,
  RemoveMethodFromPath,
  ResponseTypeOf,
  Route,
  RouteOf,
} from '@/utils/fetcher.types'
import { hasPathParamOptions } from '@/utils/fetcher.utils'

type BaseOptions = {
  headers?: Record<string, string>
  query?: Record<string, string> | URLSearchParams
}

type PostOptions<
  TEndpoint extends Route<unknown, unknown>,
  TPath extends string,
> = (TEndpoint extends Route<unknown, infer K>
  ? K extends null
    ? BaseOptions
    : {
        body: TEndpoint['request']
      } & BaseOptions
  : never) &
  (keyof ExtractParams<TPath> extends never
    ? {}
    : { params: ExtractParams<TPath> })

type GetOptions<
  TEndpoint extends Route<unknown, unknown>,
  TPath extends string,
> = Omit<PostOptions<TEndpoint, TPath>, 'body'>

export class HttpRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly message: string,
  ) {
    super(message)
    this.name = 'HttpRequestError'
  }
}

export class HTTPClient<TEndpoints extends Endpoints> {
  constructor(private readonly baseUrl?: string) {}

  private getUrlOf(
    path: string,
    pathParams: Record<string, string> = {},
    queryParams?: URLSearchParams,
  ): string {
    const url = new URL(path, this.baseUrl)
    const params = { ...pathParams }

    // replace path parameters in the URL
    url.pathname = url.pathname.replace(/:[^/.]+/g, (match) => {
      const paramKey = match.slice(1)
      if (paramKey in params) {
        return params[paramKey]
      } else {
        throw new Error(`Missing parameter: ${paramKey}`)
      }
    })

    return url.toString() + (queryParams ? `?${queryParams.toString()}` : '')
  }

  private fetch(
    path: string,
    options: RequestInit,
    pathParams: Record<string, string> = {},
    query?: BaseOptions['query'],
  ): Promise<Response> {
    let queryParams: URLSearchParams | undefined
    if (query) {
      if (query instanceof URLSearchParams) {
        queryParams = query
      } else if (Object.keys(query).length > 0) {
        const params = new URLSearchParams()
        Object.entries(query).forEach(([key, value]) => {
          if (!value) {
            return
          }

          params.append(key, value)
        })

        queryParams = params
      }
    }

    return fetch(this.getUrlOf(path, pathParams, queryParams), options).then(
      (res) => {
        if (res.ok) {
          return res
        } else {
          return res.json().then((json) => {
            throw new HttpRequestError(res.status, json.message)
          })
        }
      },
    )
  }

  get<TPath extends RemoveMethodFromPath<GetEndpointPathsFrom<TEndpoints>>>(
    path: TPath,
    options?: GetOptions<RouteOf<TEndpoints, 'POST', TPath>, TPath>,
  ): Promise<ResponseTypeOf<TEndpoints, 'GET', TPath>> {
    return this.fetch(
      path,
      { method: 'GET' },
      hasPathParamOptions(options) ? options.params : {},
      options?.query,
    ).then((res) => res.json())
  }
}
