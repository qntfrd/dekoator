/** Refac the way arguments are decorated
 *
 *  @param kind - Whether it's the koa ctx/next or a picked value
 *  @param param - Defines the path for the pick decorator
 */
const DecorateParam = (kind: "pick"|"ctx"|"next", param?: Array<string|number>) =>
  (target: Object, // The object to decorate which we need to take the constructor of
    property: string, // The name of the decorated method
    index: number // The index of the decorated argument
  ) => {
    // The metadata will be set if the same decorator is used several times
    // Which may be the case of Pick
    if (Reflect.hasOwnMetadata(`${property}__${kind}`, target.constructor))
      Reflect.defineMetadata(`${property}__${kind}`, [...Reflect.getOwnMetadata(`${property}__${kind}`, target.constructor), index], target.constructor)
    else
      Reflect.defineMetadata(`${property}__${kind}`, [index], target.constructor)

    // In case of Pick, we also need to define metadata for its parameters
    if (param)
      Reflect.defineMetadata(`${property}__${kind}__${index}`, param, target.constructor)
  }

/** Pick any field in the koa.context and feed it to the decorated argument
 *
 *  ```ts
 *  Pick("request", "body", "users", 2, "username")
 *  // is equivalent to
 *  return ctx.request?.body?.users[2]?.username
 *  ```
 *
 *  One can use it either in the parameters or as a builder
 *  ```ts
 *  const Uid = Pick("request", "body", "uid")
 *
 *  @Route("/")
 *  class {
 *    @Post()
 *    plop(@Uid uid: string, @Pick("request", "body", "uid") uid2: string) {
 *      assert.equal(uid, uid2) // true
 *    }
 *  }
 *  ```
 *
 *  @param params - The path of the item you want to pick
 */
export const Pick = (...param: Array<string|number>) => DecorateParam("pick", param)

/** Feed the koa context to the decorated argument
 *
 *  Ctx is not a generator:
 *  ```ts
 *  @Route("/")
 *  class {
 *    @Get()
 *    method(@Ctx ctx: Koa.Context) {}
 *  }
 *  ```
 */
export const Ctx = DecorateParam("ctx")

/** Feed the koa next to the decorated argument
 *
 *  Next is not a generator:
 *  ```ts
 *  @Route("/")
 *  class {
 *    @Get()
 *    method(@Next next: Koa.Next) {}
 *  }
 *  ```
 */
export const Next = DecorateParam("next")