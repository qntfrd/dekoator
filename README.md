# dekoator

Typescript decorator for koa

- [dekoator](#dekoator)
  - [Usage](#usage)
  - [@Route](#route)
  - [@Get, @Post, @Put, @Patch and @Del](#get-post-put-patch-and-del)
  - [@Ctx && @Next parameter decorators](#ctx--next-parameter-decorators)
  - [@Pick](#pick)
  - [koa middlewares and `decorateMiddleware`](#koa-middlewares-and-decoratemiddleware)

## Usage

```ts
// user crud service
import { Route, IService } from "dekoator"
import { Post, Get } from "dekoator"
import { Pick, Ctx } from "dekoator"

// import some User
import { User } from "../models"
interface UserDTO {
  username: string
  password: string
  email:    string
}

// Will create a decoratior to put `ctx.request.body` in the decorated parameter
const Payload = Pick("request", "body")
// Will create a decorator to pick `ctx.param.uid`
const Uid = Pick("param", "uid")

@Route("/users") // this class is "bound" to the route `/users`
export class UserSvc {
  @Post() // POST on /users will call this method
  createUser(@Payload user: UserDTO) {
    return (new User(body)).save() // returning will wait for the promise to fullfil
                                   // and set the result to `ctx.body`
  }

  @Get()
  // The koa context is still available using the ctx decorator
  // here page === ctx.query.page
  listUsers(@Pick("query", "page") page: number = 0, @Ctx ctx: Koa.Context) {
    const users = User.findMany().skip(100 * page).limit(100).toList()
    const count = await User.count()
    ctx.set("links", magicallyGenerateLinksHeadersForPageAndLimit(page, 100))
    return users // will wait for the User.findMany to finish
  }

  getUserById(uid: string) {
    return User.findOne(uid)
  }

  @Get("/:uid") // Will listen to get on `/users/:uid`
  getOne(@Uid uid: string, @Ctx ctx) {
    const user = await this.getUserById(uid)
    if (!user) throw new Error("not_found")
    return user
  }
}

// You have to do that in order to access the `.routes()`
interface UserService extends IService {}
```

```ts
import Koa from "koa"
import { UserService } from "./services/user"

const app = new Koa()
  .use(new UserService().routes()) // uses koa-router underneath
```


## @Route

```ts
@Route(path: string): class
```

The Route decorator indicates that the decorated class will listen to the route
passed in the decorator parameter

## @Get, @Post, @Put, @Patch and @Del

```ts
@Verb(path?: string): func
```

Where `Verb` is one of:
- Get
- Post
- Patch
- Del
- Put

and `path` is an optional nested route

e.g. if `@Route("/foo")` is the class decorator,  
and a method is decorated with `@Get("/:id")`,  
the decorated method will be called on `GET /foo/myId`


## @Ctx && @Next parameter decorators

```ts
@Ctx: arg
@Next: arg
```

If you are familiar with koa, you will be able to access koa's context and next
by just decorating your function parameter with either.

```ts
@Route("/")
class foo {
  @Get()
  list(@Ctx ctx: Koa.Context, @Next next: Koa.Next) {}

  // Because it's decorated, one can inverse parameters
  @Post()
  create(@Next next: Koa.Next, @Ctx ctx: Koa.context) {}
}
```

## @Pick

```ts
Pick(...path: string[]): arg
```

Pick allows you to convert a part of your `Koa.Context` into an argument decorator.

The parameters is the path of the requested value.
For example:
- `Pick("foo", "bar")` is equivalent to `ctx.foo?.bar`
- `Pick("request", "body", "something", "nested")` is equivalent to `ctx.request?.body?.something`

You can use `@Pick` directly in the method arguments, or use it as a generator:

```ts
const Uid = Pick("param", "uid")

@Route("/:uid")
class foo {
  @Get()
  getOne(@Uid uid: string, @Pick("param", "uid") uid2: string) {
    // uid === uid2
  }
}
```

## koa middlewares and `decorateMiddleware`

The decorateMiddleware is a function that converts a koa middleware as a decorator

```ts
const logger = () => async (ctx: Koa.Context, next: Koa.Next) => {
  const now = Date.now()
  await next()
  console.log(`${ctx.method} ${ctx.url} in ${Date.now() - now}ms`)
}

const validator = (schema: object) => (ctx: Koa.Context, next: Koa.Next) => {
  const { value: payload, error } = Joi.object(schema).validate(ctx.request.body)
  if (error) throw new BadRequestError(error)
  ctx.payload = Object.freeze(payload)
  return next()
}

const Logger = decorateMiddleware(logger)
const Validator = decorateMiddleware(validator)

@Route("/")
@Logger() // middlewares can be at class level
class foo {
  @Post()
  @Validator({ username: Joi.string().required() }) // and at handler level
  create(@Pick("payload", "username") username: string) {
    return { username }
  }
}
```
