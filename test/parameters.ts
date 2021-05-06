import client from "supertest"
import bp from "koa-bodyparser"

//#region  setup
import Koa from "koa"
import { IService, Route, Pick, Ctx, Next, Get, Patch } from "../src"
import { Post, decorateMiddleware } from "../src"
const app = new Koa()

const bodyparser = decorateMiddleware(bp)

@Route("/users")
@bodyparser()
class User {
  @Post("/:uid")
  async userList(
    @Pick("params", "uid") uid: string,
    @Next next: Koa.Next,
    @Pick("request", "body") payload: object,
    @Pick("query", "filters") filters: string[],
    @Ctx ctx: Koa.Context
  ) {
    ctx.status = 201
    await next()
    return { uid, payload, filters }
  }

  @Get()
  getOnePick(@Pick("query", "filters", 1) foo: string, @Pick("query", "filters") filters: string[]) {
    return { foo, filters }
  }

  @Post()
  postOnePick(@Pick("request", "body", 1, "plop", 2, "bar") foo: string) {
    return { foo }
  }

  @Patch()
  patchOne(@Pick("foobar") foo?: string, @Pick("request", "body", "bar", "baz") baz?: string) {
    return { foo: foo ?? baz ?? 42 }
  }
}
interface User extends IService {}
const usrSvc = new User()
app.use(usrSvc.router.routes()).use(usrSvc.router.allowedMethods())
const server = app.callback()
//#endregion

describe("Should be able to pick parameters", () => {
  it("Should be able to pick anything from the context", done => {
    client(server).post("/users/foo?filters=foo&filters=bar")
      .send({ username: "foo" })
      .expect(201, {
        uid: "foo",
        payload: { username: "foo" },
        filters: ["foo", "bar"]
      }, done)
  })

  it("Should be able to pick an item from an object in an array", done => {
    client(server).post("/users")
      .send([{}, { plop: [{}, {}, { bar: 42 }]}])
      .expect(200, { foo: 42 }, done)
  })
  it("Should be able to pick an item from an object with a numeric key", done => {
    client(server).post("/users")
      .send([{}, { plop: {2: {bar: 42 }}}])
      .expect(200, { foo: 42 }, done)
  })

  it("Should return undefined if the picked value is undefined", done => {
    client(server).patch("/users")
      .send({ baz: "plop" })
      .expect(200, { foo: 42 }, done)
  })
})