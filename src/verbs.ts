/** Decorates an HTTP Verb
 *
 *  @param verb the verb koa-router uses
 */
const extendWith = (verb: string) =>
  /** An optional path that will be nested to the the @Route one
   *
   *  @Notice Verbs MUST BE nested to a class decorated with `@Route`
   *
   *  ```ts
   *  @Route("/foo")
   *  class {
   *    @Get("/bar") // listens to GET /foo/bar
   *    bar() {}
   *
   *    @Get() // listens to GET /foo
   *    foo() {}
   *  }
   *  ```
   * @param path - The sub path, nested to the `@Route` decorated class
   * @returns The actual generator
   */
  (path?: string) =>
    /** Converts a methods to a koa-route
     *
     *  @param target - The object to decorate (take the constructor)
     *  @param property - The name of the decorated method
     */
    (target: any, property: string) => {
      // Defines a list of handlers for each verbs
      // because each verb may be on a nested route,
      // the metadata is {route -> method}
      if (Reflect.hasOwnMetadata(verb, target.constructor))
        Reflect.defineMetadata(verb, {...Reflect.getOwnMetadata(verb, target.constructor), [path ?? "__default__"]: property}, target.constructor)
      else
        Reflect.defineMetadata(verb, {[path ?? "__default__"]: property}, target.constructor)
    }

export const Get = extendWith("get")
export const Post = extendWith("post")
export const Patch = extendWith("patch")
export const Del = extendWith("del")
export const Put = extendWith("put")
