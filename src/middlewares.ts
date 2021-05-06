import Koa from "koa"

/** Your usual koa middleware with its context and next parameters
 *
 *  @param ctx  - Your usual koa Context
 *  @param next - Your usual koa Next method
 */
type Handler = (ctx: Koa.Context, next: Koa.Next) => Promise<void>|void

/** Defines a middleware, which is necessarily a function that retruns a koa handler
 *
 *  For the sake of consistency, a middleware is always with the form:
 *  ```js
 *  koa.use(middleware())
 *  ```
 *  Which, with dekoator will transform in
 *  ```
 *  @Middleware()
 *  ```
 *
 *  @param args - The arguments the middleware accepts
 */
export type Middleware = (...args: any[]) => Handler

/** Converts a traditional koa middleware into a decorator
 *
 *  @Notice The middleware must be of the form
 *  `(...args: unknown[]) => (ctx: Koa.Context, next: Koa.Next) => Promise<void>|void`
 *
 *  @param middleware - The middleware to wrap as a decorator
 *  @returns - The decorator that'll use your middleware
 *
 *  The decorator will forward the parameters one passes to your middleware:
 *  ```ts
 *  @decorated(foo, bar)
 *  // is equivalent to
 *  koa.use(mdw(foo, bar)
 *  ```
 *
 *  The decorator can be used on a method or the route class
 */
export const decorateMiddleware = (middleware: Middleware) =>
  (...args: any) => (
    target: Object, // The object which we need to take the constructor of
    property?: string, // Whether it is a class decorator or a method one,
                       // in which case the property is the method name
  ): any => {
    if (property === undefined) { // class middleware
      let metadata = Reflect.getOwnMetadata("__middlewares__", target)
      if (!metadata) metadata = []
      // Decorators are resolved from the bottom to the top
      // If you want your middlewares to be executed in the "natural" top-bottom
      // order, you need to unshift
      metadata.unshift(middleware(...args))
      Reflect.defineMetadata("__middlewares__", metadata, target)
      return
    }

    // method middleware
    let metadata = Reflect.getOwnMetadata(`${property}__middlewares`, target.constructor)
    if (!metadata) metadata = []
    // Decorators are resolved from the bottom to the top
    // If you want your middlewares to be executed in the "natural" top-bottom
    // order, you need to unshift
    metadata.unshift(middleware(...args))
    Reflect.defineMetadata(`${property}__middlewares`, metadata, target.constructor)
  }