import express from "express";
import { createPool } from "mysql2";

import { dbConfig } from "../config.mjs";

export const apiTestRouter = express.Router();
apiTestRouter.use(express.json());

// MySQL Pool so we don't have to recreate new connections every call
const pool = createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}).promise();

apiTestRouter.get("/session/", async function (req, res, next) {
  try {
    const session_id = req.session.session_id;

    let [user] = await pool.execute(
      "SELECT display_name, session_id FROM User_Sessions WHERE session_id = ?",
      [session_id]
    );

    if (!user[0]) {
      return res.status(404).json({ err: "user does not exist" });
    }

    return res.status(200).json(user[0]);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});
