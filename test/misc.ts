import client from "supertest"

//#region setup
import Koa from "koa"
import { IService, Route, Pick, Ctx } from "../src"
import { Get, Post, Put, Patch, Del } from "../src"
const app = new Koa()

@Route("/users")
class User {
  @Get()
  @Post()
  userList(@Pick("request", "method") method: string) {
    return { method }
  }

  @Get("/:uid")
  @Post("/:uid")
  @Del("/:uid")
  @Patch("/:uid")
  @Put("/:uid")
  oneUser(@Pick("request", "method") method: string, @Pick("params", "uid") uid: string) {
    return { method, uid }
  }

  @Del()
  removeAllUsers() { return { success: 42 }}
}
interface User extends IService {}
const usrSvc = new User()
app.use(usrSvc.router.routes()).use(usrSvc.router.allowedMethods())
const server = app.callback()
//#endregion

describe("Can CRUD a rest resource", () => {
  it("Should manage GET requests", done => {
    client(server).get("/users")
      .expect(200, { method: "GET" }, done)
  })

  it("Should manage POST requests", done => {
    client(server).post("/users")
      .expect(200, { method: "POST" }, done)
  })

  it("Should fail if a verb is not present on a route", done => {
    client(server).put("/users")
      .expect(405, {}, done)
  })

  it("Should handle nested GET requests", done => {
    client(server).get("/users/user")
      .expect(200, { method: "GET", uid: "user" }, done)
  })

  it("Should handle nested PUT requests", done => {
    client(server).put("/users/user")
      .expect(200, { method: "PUT", uid: "user" }, done)
  })

  it("Should handle nested DELETE requests", done => {
    client(server).del("/users/user")
      .expect(200, { method: "DELETE", uid: "user" }, done)
  })

  it("Should handle nested PATCH requests", done => {
    client(server).patch("/users/user")
      .expect(200, { method: "PATCH", uid: "user" }, done)
  })

  it("Should be able to use a verb that was already used on another route", done => {
    client(server).del("/users")
      .expect(200, { success: 42 }, done)
  })
})
