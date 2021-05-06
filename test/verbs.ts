import client from "supertest"

//#region setup
import Koa from "koa"
import { IService, Route, Ctx } from "../src"
import { Get } from "../src"
const app = new Koa()

@Route("/users")
class User {
  @Get()
  userList(@Ctx ctx: Koa.Context) {
    ctx.body = { plop: 42 }
    return { foo: "bar" }
  }
}
interface User extends IService {}
const usrSvc = new User()
app.use(usrSvc.router.routes()).use(usrSvc.router.allowedMethods())
const server = app.callback()
//#endregion

describe("Miscelaneous", () => {
  it("Does not use the return value if ctx.body is explicitely set", done => {
    client(server).get("/users")
      .expect(200, { plop: 42 }, done)
  })
})
