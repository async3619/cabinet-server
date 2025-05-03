type MethodTypes = 'GET' | 'POST'

export interface Route<
  TResponse,
  TRequest = null,
  TPathParams = Record<string, string>,
> {
  pathParams: TPathParams
  request: TRequest
  response: TResponse
}

export type Endpoints = {
  [key: string]: Route<unknown, unknown>
}

type FilterEndpointByMethodTypes<
  TMethodType extends MethodTypes,
  TEndpoints extends Endpoints,
> = {
  [TPath in keyof TEndpoints as TPath extends `${TMethodType} ${string}`
    ? TPath
    : never]: {}
}

export type RemoveMethodFromPath<TPath> =
  TPath extends `${string} ${infer TRest}` ? TRest : TPath

export type GetEndpointPathsFrom<TEndpoints extends Endpoints> =
  RemoveMethodFromPath<
    Exclude<
      keyof FilterEndpointByMethodTypes<'GET', TEndpoints>,
      number | symbol
    >
  >

export type RouteOf<
  TEndpoints extends Endpoints,
  TMethod extends MethodTypes,
  TPath extends string,
> =
  TEndpoints[`${TMethod} ${TPath}`] extends Route<
    infer TResponse,
    infer TRequest
  >
    ? Route<TResponse, TRequest>
    : never
export type ResponseTypeOf<
  TEndpoints extends Endpoints,
  TMethod extends MethodTypes,
  TPath extends string,
> =
  TEndpoints[`${TMethod} ${TPath}`] extends Route<infer TResponse, any>
    ? TResponse
    : never

type ExtractParam<Path, NextPart> = Path extends `:${infer Param}`
  ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Path extends `:${infer Param}.${infer _}`
    ? Record<Param, string> & NextPart
    : Record<Param, string> & NextPart
  : NextPart
export type ExtractParams<Path> = Path extends `${infer Segment}/${infer Rest}`
  ? ExtractParam<Segment, ExtractParams<Rest>>
  : ExtractParam<Path, {}>
