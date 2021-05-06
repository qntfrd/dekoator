import Koa from "koa"
import Router from "koa-router"
import { Middleware } from "./middlewares"

/** Eeach service must extend this interface in order to be usable by koa
 *
 *  ```ts
 *  @Route("/") // will convert the class to the implementation of an IService
 *  class Foo {}
 *  export interface Foo extends IService {} // otherwise TS won't know Foo can access to .router
 *  ```
 */
export interface IService {
  /** The instance of koa-router
   *
   *  Because you manage your koa instance, you need the `router` property to
   *  feed your service in koa:
   *  ```ts
   *  import Koa from "koa"
   *  const service = new Service() // your service
   *  const app = new Koa().use(service.router.routes()).use(service.router.allowedMethods())
   *  ```
   */
  router: Router
}

/** Implement the actual pick method
 *
 * @param path - The actuall path to the stuff to pick
 * @param obj - The object in which to pick what we want
 * @returns - The value in obj[path]
 */
const pick = (path: Array<string|number>, obj: any) => {
  let val = obj
  let key = path[0]
  for (let i = 0 ; i < path.length ; i++) {
    if (val === undefined)
      return
    key = path[i]
    val = !Number.isInteger(Number(key))
      ? val[key] // is an object => pick key
      : !Array.isArray(val)
      ? val[key] // not an array? it may be a numeric key
      : val[(val.length + (key as number)) % val.length] // if the number is negative, start at the end
  }
  return val
}

/** From the decorated parameters, return a function that will feed the arguments to the method
 *
 *  @param property The decorated method (that exists on the service instance)
 *  @param target The decorated service
 *  @returns A function to get the decorated properties as an array
 */
const buildParam = (property: string, target: Object) => {
  // The list of args in place, with the function to resolve said arg with the context
  const params: any[] = []

  // The pick decorator has arguments that are passed to `{property}__pick__{argument index}`
  // Resolver takes a path and generates a function to resolve the pick
  // The path being what is stored in `{property}__pick__{arg idx}`
  const resolver = (path: string[]) => (ctx: Koa.Context) => pick(path, ctx)

  // Pick, Ctx and Next have as metadata parameters a list of arguments index
  // which needs to have their values resolved

  if (Reflect.hasOwnMetadata(`${property}__pick`, target)) {
    const indexes = Reflect.getOwnMetadata(`${property}__pick`, target)
    indexes.forEach((idx: number) => {
      params[idx] = resolver(Reflect.getOwnMetadata(`${property}__pick__${idx}`, target))
    })
  }
  if (Reflect.hasOwnMetadata(`${property}__ctx`, target)) {
    const indexes = Reflect.getOwnMetadata(`${property}__ctx`, target)
    indexes.forEach((idx: number) => {
      params[idx] = (ctx: Koa.Context) => ctx
    })
  }
  if (Reflect.hasOwnMetadata(`${property}__next`, target)) {
    const indexes = Reflect.getOwnMetadata(`${property}__next`, target)
    indexes.forEach((idx: number) => {
      params[idx] = (ctx: Koa.Context, next: Koa.Next) => next
    })
  }

  // Returns a function to generate all parameters at once in an array
  return (ctx: Koa.Context, next: Koa.Next) => params.map(h => h(ctx, next))
}

/** Decoreates a class as a service bound to a route
 *
 *  @params base - The path on which the class is bound (prefixed with `/`)
 *
 *  ```ts
 *  @Route("/")
 *  class Foo {}
 *  interface Foo extends IService {}
 *  ```
 */
export function Route<
  T extends { new(...args: any[]): {} } // the class must have a constructor with 0 or more parameters
>(base: string) {
  /** Overrides the default constructor to construct an instance of an IService
   *
   *  @param constructor - The decorated class
   */
  return (constructor: T): any =>
    class extends constructor implements IService {
      /** The instance of Koa-Router */
      public router = new Router({ prefix: base })

      /** Generically generates the routes for this class
       *
       *  @param route - The base route of the class (from the Route decorator)
       *  @param name - The class method to call when a `method` is performed on `route`
       *  @param method - The method to generate the handler for
       */
      private addHandler(route: string, name: string, method: "get"|"post"|"del"|"put"|"patch") {
        // Gets a function to resolve parameters as an array based on Koa.Context, Koa.Next
        const paramsBuilder = buildParam(name, constructor)
        const path = route === "__default__" ? "/" : route
        const middlewares = ((Reflect.getOwnMetadata(`${name}__middlewares`, constructor) || []) as Middleware[])

        // Set a new koa-router handler
        this.router[method](path, ...middlewares, async (ctx: Koa.Context, next: Koa.Next) => {
          const params = paramsBuilder(ctx, next) // resolves parameters
          const ret = await (this as any)[name](...params)
          if (!ctx.body) // if the handler has not set the body, use what it returned
            ctx.body = ret
        })
      }

      /** Overrides the default constructor
       *
       *  @param args The default arguments for the parent class
       */
      constructor(...args: any[]) {
        super(...args)

        // resolve class global middlewares
        if (Reflect.hasOwnMetadata("__middlewares__", constructor)) {
          Reflect.getOwnMetadata("__middlewares__", constructor)
            .forEach((mdw: Middleware) => {
              this.router.use(mdw)
            })
        }

        // Resolves each verb
        // Note: The metadata structure is { verb: { route: method }}
        // because one verb can have its own sub route for the decorated method
        ;["get","post","put","patch","del"]
          .forEach(verb => {
            if (Reflect.hasOwnMetadata(verb, constructor)) {
              const routes = Reflect.getOwnMetadata(verb, constructor)
              for (const route in routes)
                this.addHandler(route, routes[route], verb as any)
            }
          })
      }
    }
}