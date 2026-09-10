import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { closePool } from "../../db/pool.js";

/**
 * Teste de integração do fluxo de auth (B1) + guarda por papel.
 * Requer o banco no ar e populado: `npm run db:setup` na raiz.
 * Usa as contas do seed (senha: senha123).
 */
const app = createApp();
const ADMIN = "ana.souza@infohub.amf.br";
const STUDENT = "joao.alves@acad.amf.br";
const PASS = "senha123";

afterAll(async () => {
  await closePool();
});

describe("POST /auth/login", () => {
  it("rejeita senha errada com 401", async () => {
    const res = await request(app).post("/auth/login").send({ email: ADMIN, password: "errada" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejeita payload inválido com 400", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nao-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("loga com credenciais válidas e devolve accessToken + cookie de refresh", async () => {
    const res = await request(app).post("/auth/login").send({ email: ADMIN, password: PASS });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.user.role).toBe("ADMIN");
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/infohub_rt=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});

describe("GET /users/me", () => {
  it("401 sem token", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });

  it("200 com token, trazendo o próprio usuário", async () => {
    const login = await request(app).post("/auth/login").send({ email: STUDENT, password: PASS });
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(STUDENT);
    expect(res.body.studentProfile).not.toBeNull();
  });
});

describe("guarda por papel", () => {
  it("aluno recebe 403 em rota exclusiva de staff", async () => {
    const login = await request(app).post("/auth/login").send({ email: STUDENT, password: PASS });
    const res = await request(app)
      .get("/users/staff")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /auth/refresh", () => {
  it("rotaciona: novo cookie e o antigo passa a ser inválido", async () => {
    const login = await request(app).post("/auth/login").send({ email: ADMIN, password: PASS });
    const firstCookie = login.headers["set-cookie"] as unknown as string[];
    expect(firstCookie?.length).toBeGreaterThan(0);

    const refreshed = await request(app).post("/auth/refresh").set("Cookie", firstCookie);
    expect(refreshed.status).toBe(200);
    expect(typeof refreshed.body.accessToken).toBe("string");

    const reuse = await request(app).post("/auth/refresh").set("Cookie", firstCookie);
    expect(reuse.status).toBe(401);
  });
});
