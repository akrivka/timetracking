import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import postgres from "postgres";
import { Credentials } from "../lib/auth";
import { serializeEntries, deserializeEntries } from "../lib/entries";
import { addEntryLocal } from "../lib/localDB";
import { delay, wait } from "../lib/util";

const db_url = process.env.DATABASE_URL;
const runningLocally = db_url == undefined || db_url.search("localhost") > 0;
const sql = postgres(
  db_url,
  runningLocally ? {} : { ssl: { rejectUnauthorized: false } }
);

async function signup(credentials: Credentials): Promise<void> {
  await sql`INSERT INTO users (name, password_hash)
                VALUES (
                ${credentials.username},
                ${credentials.hashedPassword}
                )`;
}

async function userExists(credentials: Credentials): Promise<boolean> {
  const results = await sql`SELECT * FROM users
        WHERE name=${credentials.username}
        AND password_hash=${credentials.hashedPassword}`;
  return results.length > 0;
}

function getCredentialsFromReq(req: any): Credentials {
  return {
    username: req.query.username,
    hashedPassword: req.query.hashedPassword,
  };
}

// BACKEND
const app = express()
  .use(bodyParser.urlencoded({ extended: false }))
  .get("/api/test", async (_, res) => res.send("Hello, world!"))
  .get("/api/login", async (req: any, res: any) => {
    const credentials = getCredentialsFromReq(req);

    try {
      const success: boolean = await userExists(credentials);
      if (success) {
        res.send("ok");
      } else {
        res.send("username+password not found");
      }
    } catch (e) {
      res.send(e);
    }
  })
  .post("/api/signup", async (req: any, res: any) => {
    const credentials = getCredentialsFromReq(req);

    if (credentials.username.length < 1) {
      res.send("Non-empty username required");
    } else if (credentials.hashedPassword.length < 1) {
      res.send("Non-empty password hash required (shouldn't be possible)");
    } else {
      try {
        await signup(credentials);
        res.send("ok");
      } catch (e) {
        res.send(e);
      }
    }
  })
  .get("/api/entries", async (req: any, res: any) => {
    await wait(delay);
    const credentials = getCredentialsFromReq(req);

    const after = req.query.after || 0;

    try {
      const success: boolean = await userExists(credentials);
      if (success) {
        const entries = (
          await sql`SELECT id, time, before, after, lastmodified, deleted from entries WHERE username = ${credentials.username} and lastmodified > ${after}`
        ).map((row: any) => ({
          time: new Date(row.time as number),
          before: (row.before || undefined) as string | undefined,
          after: (row.after || undefined) as string | undefined,
          lastModified: new Date(row.lastmodified as number),
          deleted: row.deleted as boolean,
          id: row.id as string,
        }));

        const s = serializeEntries(entries);
        res.send(encodeURIComponent(s));
      } else {
        res.send("username+password not found");
      }
    } catch (e) {
      console.log(e);

      res.send(e);
    }
  })
  .post("/api/update", async (req: any, res: any) => {
    await wait(delay);
    const credentials = getCredentialsFromReq(req);

    try {
      const success: boolean = await userExists(credentials);

      if (success) {
        let entries = deserializeEntries(
          decodeURIComponent(req.body.entries)
        )

        for (const entry of entries) {
          await sql`INSERT INTO entries (username, id, time, before, after, lastmodified, deleted)
          VALUES (
              ${credentials.username},
              ${entry.id},
              ${entry.time.getTime()},
              ${entry.before || null},
              ${entry.after || null},
              ${entry.lastModified.getTime()},
              ${entry.deleted}
          )
          ON CONFLICT ON CONSTRAINT uniqueness DO UPDATE SET
              before = EXCLUDED.before,
              after = EXCLUDED.after,
              time = EXCLUDED.time,
              lastmodified = EXCLUDED.lastmodified,
              deleted = EXCLUDED.deleted
          WHERE
              entries.lastmodified < EXCLUDED.lastmodified
      `;
        }
        res.send("ok");
      } else {
        res.send("username+password not found");
      }
    } catch (e) {
      console.log(e);

      res.send(e);
    }
  });

export const handler = app;
