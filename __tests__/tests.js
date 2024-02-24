const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
const {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
} = require("@jest/globals");
const cheerio = require("cheerio");

let server, agent;

function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const user = {
  email: "user@example.com",
};

describe("Tests for sports scheduler", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("should successfully access the home page", async () => {
    const res = await agent.get("/");
    expect(res.statusCode).toBe(200);
  });

  test("should successfully get login page", async () => {
    const res = await agent.get("/login");
    expect(res.statusCode).toBe(200);
  });

  test("should successfully log in", async () => {
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/login").send({
      email: user.email,
      password: "123456",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("should successfully get sign up", async () => {
    const res = await agent.get("/signup");
    expect(res.statusCode).toBe(200);
  });

  test("should successfully sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/signup").send({
      name: "New User",
      Email: "newuser@example.com",
      pass: "123456",
      cPass: "123456",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    expect(res.header.location).toBe("/login");
  });
});
