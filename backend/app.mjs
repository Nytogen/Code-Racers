import { createServer } from "https";
import express from "express";
import { createPool } from "mysql2";
import { readFileSync } from "fs";

import { randomBytes } from "crypto";
const randomBytesAsync = promisify(randomBytes);

import session from "express-session";
import mysqlStore from "express-mysql-session";
import cors from "cors";
import { promisify } from "util";

import { dbConfig, sslKey, sslCertficate, allowedOrigins } from "./config.mjs";

//Router imports
import { apiTestRouter } from "./routes/apitest.mjs";
import { lobbiesRouter } from "./routes/lobbies.mjs";
import { gameRouter } from "./routes/game.mjs";

const PORT = 3000;
const MAX_PLAYERS = 4;

// Get the certificate details to run the server on HTTPS
const privateKey = readFileSync(sslKey);
const certificate = readFileSync(sslCertficate);
const config = {
  key: privateKey,
  cert: certificate,
};

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

// Server stuff
const app = express();
app.use(express.json());

// Set CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Adds cookies to cross-site requests
  })
);

// Set Sessions
const sqlStore = mysqlStore(session);
const sessionStore = new sqlStore({
  connectionLimit: 10,
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  createDatabaseTable: true,
  clearExpired: true,
});

app.use(
  session({
    secret: "pray for challenge factor >= 1",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 18, // 18 hours in number of milliseconds
      httpOnly: true, // Client can't access cookie
      secure: true, // HTTPS only
      samesite: true, // Only send cookies when same domain
    },
  })
);

// Print out stuff when api call
app.use(function (req, res, next) {
  console.log(
    "HTTP request",
    req.session.session_id,
    req.method,
    req.url,
    req.body
  );
  next();
});

async function randomAlphaNumeric(length) {
  const buffer = await randomBytesAsync(length);
  return buffer.toString("hex");
}

// Creates a session for the user
async function generateSession(req) {
  try {
    // Create random 8 digit alphanumeric string
    const sessionID = await randomAlphaNumeric(8);

    // Add session id into database and generate random name
    await pool.execute("INSERT INTO User_Sessions (session_id) VALUES (?)", [
      sessionID,
    ]);

    // Add the id to the session
    req.session.session_id = sessionID;
  } catch (err) {
    console.log(err);
  }
}

// Generates a session if it doesn't exist
const isAuthenticated = async function (req, res, next) {
  if (!req.session.session_id) {
    await generateSession(req);
  }
  next();
};

//Routers
app.use("/api", isAuthenticated, apiTestRouter);
app.use("/api/lobbies", isAuthenticated, lobbiesRouter);
app.use("/api/game", isAuthenticated, gameRouter);

export const server = createServer(config, app);

server.listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log("HTTPS server on https://localhost:%s", PORT);
});
