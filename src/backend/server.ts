import bodyParser from "body-parser";
import "dotenv/config";
import express from "express";
import postgres from "postgres";
import { Credentials } from "../context/UserContext";
import { deserializeEntries, serializeEntries } from "../lib/entries";
import { delay, now, wait } from "../lib/util";

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

// subscribers map from usernames to array of response callbacks
const subscribers = new Map<string, Map<string, any>>();

const resolveSubscribers = (username: string, clientID?: string) => {
  const clients = subscribers.get(username);

  if (clients) {
    clients.forEach((res, id) => {
      if (id !== clientID) {
        res.send("ok");
        clients.delete(id);
      }
    });
  }
};

// BACKEND
const app = express()
  .use(bodyParser.urlencoded({ limit: "200mb", extended: false }))
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
  .get("/api/profile", async (req: any, res: any) => {
    const credentials = getCredentialsFromReq(req);

    try {
      const success: boolean = await userExists(credentials);
      if (success) {
        const results = await sql`SELECT profile FROM users
        WHERE name=${credentials.username}
        AND password_hash=${credentials.hashedPassword}`;

        res.send(JSON.stringify(results[0].profile));
      } else {
        res.send("username+password not found");
      }
    } catch (e) {
      res.send(e);
    }
  })
  .post("/api/profile", async (req: any, res: any) => {
    const credentials = getCredentialsFromReq(req);

    try {
      const success: boolean = await userExists(credentials);

      if (success) {
        const results =
          await sql`UPDATE users SET profile=${req.body.profile} WHERE name=${credentials.username} AND password_hash=${credentials.hashedPassword}`;

        res.send("ok");
      } else {
        res.send("username+password not found");
      }
    } catch (e) {
      res.send(e);
    }
  })
  .get("/api/entries", async (req: any, res: any) => {
    await wait(delay);
    const credentials = getCredentialsFromReq(req);

    const modifiedAfter = req.query.modifiedAfter || 0;
    const syncedAfter = req.query.syncedAfter || 0;
    const includeDeleted = req.query.includeDeleted || false;

    try {
      const success: boolean = await userExists(credentials);
      if (success) {
        const entries = (
          !includeDeleted
            ? await sql`SELECT id, time, before, after, lastmodified, lastsynced, deleted from entries WHERE username = ${credentials.username} and lastmodified > ${modifiedAfter} and lastsynced >= ${syncedAfter} and deleted = false`
            : await sql`SELECT id, time, before, after, lastmodified, lastsynced, deleted from entries WHERE username = ${credentials.username} and lastmodified > ${modifiedAfter} and lastsynced >= ${syncedAfter}`
        ).map((row: any) => ({
          time: new Date(row.time as number),
          before: (row.before || undefined) as string | undefined,
          after: (row.after || undefined) as string | undefined,
          lastModified: new Date(row.lastmodified as number),
          lastSynced: new Date(row.lastsynced as number),
          deleted: row.deleted as boolean,
          id: row.id as string,
        }));

        res.send(encodeURIComponent(serializeEntries(entries)));
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
    const clientID = req.query.clientID;

    try {
      const success: boolean = await userExists(credentials);

      if (success) {
        let entries = deserializeEntries(decodeURIComponent(req.body.entries));

        const lastSynced = now().getTime();
        for (const entry of entries) {
          await sql`INSERT INTO entries (username, id, time, before, after, lastmodified, lastsynced, deleted)
          VALUES (
              ${credentials.username},
              ${entry.id},
              ${entry.time.getTime()},
              ${entry.before || null},
              ${entry.after || null},
              ${entry.lastModified.getTime()},
              ${lastSynced},
              ${entry.deleted}
          )
          ON CONFLICT ON CONSTRAINT uniqueness DO UPDATE SET
              before = EXCLUDED.before,
              after = EXCLUDED.after,
              time = EXCLUDED.time,
              lastmodified = EXCLUDED.lastmodified,
              lastsynced = ${lastSynced},
              deleted = EXCLUDED.deleted
          WHERE
              entries.lastmodified < EXCLUDED.lastmodified
      `;
        }

        resolveSubscribers(credentials.username, clientID);
        res.send({ lastSynced, status: "ok" });
      } else {
        res.send("username+password not found");
      }
    } catch (e) {
      console.log(e);

      res.send(e);
    }
  })
  .post("/api/export", async (req: any, res: any) => {
    try {
      const results = await sql`
            INSERT INTO reports (id, username, serialized)
            VALUES (${decodeURIComponent(req.body.id)}, ${decodeURIComponent(
        req.body.username
      )}, ${decodeURIComponent(req.body.serialized)})
          `;
      res.send("ok");
    } catch (err) {
      console.log(err);

      res.send(err);
    }
  })
  .get("/api/report", async (req: any, res: any) => {
    try {
      const results = await sql`
            SELECT serialized FROM reports WHERE id = ${decodeURIComponent(
              req.query.id
            )}
          `;
      res.send(JSON.stringify(results[0]?.serialized) || "not found");
    } catch (err) {
      console.log(err);

      res.send(err);
    }
  })
  .get("/api/sync", async (req: any, res: any) => {
    const credentials = getCredentialsFromReq(req);
    const clientID = req.query.clientID;

    try {
      if (await userExists(credentials)) {
        if (!subscribers.has(credentials.username)) {
          subscribers.set(credentials.username, new Map<string, any>());
        }
        subscribers.get(credentials.username).set(clientID, res);
      }
    } catch (e) {
      console.log(e);
      res.send(e);
    }
  });

export const handler = app;
