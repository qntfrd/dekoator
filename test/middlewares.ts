import client from "supertest"
import bp from "koa-bodyparser"

//#region setup
import Koa from "koa"
import { IService, Route, Pick, Patch, Get, decorateMiddleware } from "../src"
const app = new Koa()

const bodyparser = decorateMiddleware(bp)
const Errors = decorateMiddleware(() => async (ctx: Koa.Context, next: Koa.Next) => {
  try { await next() }
  catch (e) {
    switch (e.message) {
      case "bad_request":
        ctx.status = 400
        ctx.body = { code: "Bad Request", message: e.message }
        return
      case "not_found":
        ctx.status = 404
        ctx.body = { code: "Not Found", message: e.message }
        return
      case "internal_server_error":
      default:
        ctx.status = 500
        ctx.body = { code: "Internal Server Error", message: e.message }
        return
    }
  }
})

const getOneById = decorateMiddleware((mapping: {[k: string]: any}, from = "id") =>
  (ctx: Koa.Context, next: Koa.Next) => {
    ctx.one = mapping[ctx.params[from as string] as string]
    if (ctx.one === undefined)
      throw new Error("not_found")
    return next()
  })

const validate = decorateMiddleware(() => (ctx: Koa.Context, next: Koa.Next) => {
  if (!ctx.request.body?.username) throw new Error("bad_request")
  ctx.payload = { username: (<any>ctx.request.body).username as string }
  return next()
})

const getUserById = getOneById({ user: { id: "user", username: "meh" }}, "uid")

@Route("/users")
@bodyparser()
@Errors()
class User {
  @Get("/:uid")
  @getUserById
  getOneUser(@Pick("one") one: {username: string}) {
    return one
  }

  @Patch("/:uid")
  @validate()
  @getUserById
  updateUser(@Pick("payload") payload: {username: string}, @Pick("one") one: { username: string }) {
    return { ...one, ...payload }
  }
}
interface User extends IService {}
const usrSvc = new User()
app.use(usrSvc.router.routes()).use(usrSvc.router.allowedMethods())
const server = app.callback()
//#endregion

describe("Manage middlewares", () => {
  it("Should work with one middleware", async () => {
    await client(server).get("/users/foo")
      .expect(404, { code: "Not Found", message: "not_found" })
    await client(server).get("/users/user")
      .expect(200, { username: "meh", id: "user" })
  })

  it("Should work with several middlewares (in order)", async () => {
    await client(server).patch("/users/foo")
      .expect(400, { code: "Bad Request", message: "bad_request" })
    await client(server).patch("/users/foo")
      .send({ username: "plop" })
      .expect(404, { code: "Not Found", message: "not_found" })
    await client(server).get("/users/user")
      .send({ username: "plop" })
      .expect(200, { username: "meh", id: "user" })
  })
})