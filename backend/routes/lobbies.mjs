import express, { response } from "express";

import { randomBytes } from "crypto";
const randomBytesAsync = promisify(randomBytes);

import { promisify } from "util";

import { createPool } from "mysql2";
import { dbConfig } from "../config.mjs";

export const lobbiesRouter = express.Router();
lobbiesRouter.use(express.json());

const MAX_PLAYERS = 4;
const MAX_SPECTATORS = 4;

async function randomAlphaNumeric(length) {
  const buffer = await randomBytesAsync(length);
  return buffer.toString("hex");
}

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

const longPollLobbies = {};
const longPollLobbiesLastAccessed = {};

async function reinitializeLongPollLobbies() {
  let [lobbies] = await pool.execute(
    `SELECT lobby_id, gamestate
     FROM Lobbies`
  );

  for (let lobby of lobbies) {
    longPollLobbies[lobby.lobby_id] = {};
    if (lobby.gamestate === 0) {
      longPollLobbiesLastAccessed[lobby.lobby_id] = new Date();
    }
  }
}

async function cleanStaleLobbies() {
  const now = new Date().getTime();
  const staleLobbies = [];

  // Check the last time a longpoll was requested
  // Only includes pregame lobbies since ingame lobbies will not request
  // For long polls
  for (let [lobby_id, lastAccessed] of Object.entries(
    longPollLobbiesLastAccessed
  )) {
    if (now - lastAccessed.getTime() >= 1000 * 60 * 15) {
      staleLobbies.push(lobby_id);
    }
  }

  // Delete those lobbies and associated records
  if (staleLobbies.length != 0) {
    await pool.query(
      `DELETE 
        FROM Session_X_Lobby
        WHERE lobby_id in (?)`,
      [staleLobbies]
    );

    await pool.query(
      `DELETE 
        FROM Lobbies
        WHERE lobby_id in (?)`,
      [staleLobbies]
    );
  }

  // Notify everyone that were in those lobbies
  for (let lobby_id of staleLobbies) {
    const responses = Object.values(longPollLobbies[lobby_id]);
    delete longPollLobbies[lobby_id];
    delete longPollLobbiesLastAccessed[lobby_id];
    for (let res of responses) {
      res.status(200).json({ result: "Stale Lobby" });
    }
  }
}

async function cleanStaleSessions() {
  /* 
    Sessions last 18 hours, so by 1 day, people should have another 
    session record
  */
  const [staleSessionResult] = await pool.execute(
    `SELECT session_id
      FROM User_Sessions
      WHERE created < NOW() - INTERVAL 1 DAY`
  );

  const staleSessions = staleSessionResult.map((e) => e.session_id);

  if (staleSessions.length != 0) {
    await pool.query(
      `DELETE 
        FROM GameProgress
        WHERE session_id in (?)`,
      [staleSessions]
    );

    /* 
      if for some reason people are still in a lobby that a stale session 
      created and has been making it flagged as active for 24 hours,
      we need to kick them
    */
    const [lobbiesToDeleteResult] = await pool.query(
      `SELECT lobby_id 
        FROM Lobbies
        WHERE owner_id in (?)`,
      [staleSessions]
    );

    if (lobbiesToDeleteResult.length != 0) {
      const lobbiesToDelete = lobbiesToDeleteResult.map((e) => e.lobby_id);

      await pool.query(
        `DELETE 
          FROM Session_X_Lobby
          WHERE lobby_id in (?)`,
        [lobbiesToDelete]
      );

      await pool.query(
        `DELETE 
          FROM Lobbies
          WHERE lobby_id in (?)`,
        [lobbiesToDelete]
      );

      /*
        Notify these trolls that the owner is gone
      */
      for (let lobby_id of lobbiesToDelete) {
        const responses = Object.values(longPollLobbies[lobby_id]);
        delete longPollLobbies[lobby_id];
        delete longPollLobbiesLastAccessed[lobby_id];
        for (let res of responses) {
          res.status(200).json({ result: "Owner left" });
        }
      }
    }

    /* 
      if for some reason people are still in a lobby that a stale session 
      joined and has been making it flagged as active for 24 hours,
      we need to notify them that the stale session has left
    */
    const [lobbiesToUpdateResult] = await pool.query(
      `SELECT lobby_id 
        FROM Session_X_Lobby
        WHERE session_id in (?)`,
      [staleSessions]
    );

    if (lobbiesToUpdateResult.length != 0) {
      const lobbiesToUpdate = lobbiesToUpdateResult.map((e) => e.lobby_id);
      await pool.query(
        `DELETE 
          FROM Session_X_Lobby
          WHERE session_id in (?)`,
        [staleSessions]
      );

      /*
        Notify these trolls that the someone is gone, I don't think these
        trolls' session would last much longer anyway
      */

      for (let lobby_id of lobbiesToUpdate) {
        updateLobby(lobby_id);
      }
    }

    //We finally free to delete these sessions.
    await pool.query(
      `DELETE 
        FROM User_Sessions
        WHERE session_id in (?)`,
      [staleSessions]
    );
  }
}

await reinitializeLongPollLobbies();
setInterval(cleanStaleLobbies, 1000 * 60 * 10);
setInterval(cleanStaleSessions, 1000 * 60 * 60);

async function updateLobby(lobby_id) {
  if (longPollLobbies[lobby_id] === undefined) {
    return;
  }

  if (Object.keys(longPollLobbies[lobby_id]).length === 0) {
    return;
  }

  let responses = Object.entries(longPollLobbies[lobby_id]);
  longPollLobbies[lobby_id] = {};

  let [lobbies] = await pool.execute(
    `SELECT 
          lobby_name, 
          lobby_id,
          gamemode,
          gamestate,
          owner_id
        FROM Lobbies
        WHERE lobby_id = ?`,
    [lobby_id]
  );

  let lobby = lobbies[0];

  let [participants] = await pool.execute(
    `SELECT 
        Session_X_Lobby.session_id,
        display_name,
        lobby_role
      FROM Session_X_Lobby
        INNER JOIN User_Sessions ON Session_X_Lobby.session_id = User_Sessions.session_id
      WHERE lobby_id = ?`,
    [lobby_id]
  );

  lobby.players = participants.filter((user) => {
    return user.lobby_role === 0;
  });
  lobby.spectators = participants.filter((user) => {
    return user.lobby_role === 1;
  });

  const lobby_roles = {};
  participants.forEach((user) => {
    lobby_roles[user.session_id] = user.lobby_role;
  });

  responses.forEach(([session_id, res]) => {
    lobby.isOwner = session_id === lobby.owner_id;
    lobby.lobby_role =
      lobby_roles[session_id] != undefined ? lobby_roles[session_id] : -1;
    res.status(200).json({ result: "lobby update", data: lobby });
  });
}

lobbiesRouter.get("/", async function (req, res, next) {
  try {
    const { gamemode } = req.query;
    let [rows] = await pool.execute(
      `SELECT 
          lobby_name, 
          Lobbies.lobby_id, 
          COUNT(CASE WHEN lobby_role = 0 THEN 1 ELSE NULL END) AS numOfPlayers,
          COUNT(CASE WHEN lobby_role = 1 THEN 1 ELSE NULL END) AS numOfSpectators,
          gamestate, 
          gamemode
        FROM Lobbies LEFT OUTER JOIN
          Session_X_Lobby ON Lobbies.lobby_id = Session_X_Lobby.lobby_id
        WHERE gamemode = ?
        GROUP BY lobby_name, Lobbies.lobby_id, gamestate, gamemode`,
      [gamemode]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.post("/", async function (req, res, next) {
  try {
    const { gamemode, gamestate } = req.body;
    const { session_id } = req.session;
    const [users] = await pool.execute(
      `SELECT display_name FROM User_Sessions WHERE session_id = ?`,
      [session_id]
    );

    const lobby_id = await randomAlphaNumeric(8);

    await pool.execute(
      `INSERT Lobbies (lobby_name, lobby_id, gamemode, gamestate, owner_id) 
         VALUES (?, ?, ?, ?, ?);`,
      [
        users[0].display_name + "'s Lobby",
        lobby_id,
        gamemode,
        gamestate,
        session_id,
      ]
    );

    longPollLobbies[lobby_id] = {};

    return res.status(200).json({ lobby_id: lobby_id });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.get("/updates/:lobby_id", async function (req, res, next) {
  try {
    const { lobby_id } = req.params;
    const { session_id } = req.session;
    if (longPollLobbies[lobby_id] === undefined) {
      return res.status(400).json({ err: "Lobby Missing" });
    }

    longPollLobbies[lobby_id][session_id] = res;
    longPollLobbiesLastAccessed[lobby_id] = new Date();

    req.on("close", function () {
      // request closed unexpectedly
      if (longPollLobbies[lobby_id] != undefined) {
        delete longPollLobbies[lobby_id][session_id];
      }
    });

    req.on("end", function () {
      // request ended normally
      if (longPollLobbies[lobby_id] != undefined) {
        delete longPollLobbies[lobby_id][session_id];
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.post("/startGame/:lobby_id", async function (req, res, next) {
  try {
    const { lobby_id } = req.params;
    if (longPollLobbies[lobby_id] === undefined) {
      return res.status(400).json({ err: "Lobby Missing" });
    }

    await pool.execute(
      `UPDATE Lobbies
       SET gamestate = 1
       WHERE lobby_id = ?`,
      [lobby_id]
    );

    updateLobby(lobby_id);
    delete longPollLobbiesLastAccessed[lobby_id];

    return res.status(200).json("starting");
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.get("/:lobby_id", async function (req, res, next) {
  try {
    const { lobby_id } = req.params;
    const { session_id } = req.session;
    let [lobbies] = await pool.execute(
      `SELECT 
            lobby_name, 
            lobby_id,
            gamemode,
            gamestate,
            owner_id
          FROM Lobbies
          WHERE lobby_id = ?`,
      [lobby_id]
    );

    let lobby = lobbies[0];

    if (lobby === undefined) {
      return res.status(404).json({ err: "Unknown Lobby" });
    }

    let [participants] = await pool.execute(
      `SELECT 
          Session_X_Lobby.session_id,
          display_name,
          lobby_role
        FROM Session_X_Lobby
          INNER JOIN User_Sessions ON Session_X_Lobby.session_id = User_Sessions.session_id
        WHERE lobby_id = ?`,
      [lobby_id]
    );

    lobby.players = participants.filter((user) => {
      return user.lobby_role === 0;
    });
    lobby.spectators = participants.filter((user) => {
      return user.lobby_role === 1;
    });
    lobby.isOwner = lobby.owner_id === session_id;
    const user = participants.find((user) => {
      return user.session_id === session_id;
    });

    lobby.lobby_role = user != undefined ? user.lobby_role : -1;

    return res.status(200).json(lobby);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.patch("/:lobby_id", async function (req, res, next) {
  try {
    const { lobby_id } = req.params;
    const { session_id } = req.session;
    const { lobby_role } = req.body;
    // Check if lobby exists
    const [lobby] = await pool.execute(
      `SELECT id FROM Lobbies WHERE lobby_id = ?`,
      [lobby_id]
    );

    if (lobby.length === 0) {
      return res.status(400).json({ err: "Unknown Lobby" });
    }

    // Count the number of players in the lobby
    const [count] = await pool.execute(
      `SELECT count(*) AS numOfPlayers FROM Session_X_Lobby WHERE lobby_id = ? AND lobby_role = 0`,
      [lobby_id]
    );

    // Prevent switching to player role if already 4 players in lobby
    if (count[0].numOfPlayers === 4 && lobby_role === 0) {
      return res.status(400).json({ err: "Max number of players" });
    }

    await pool.execute(
      `UPDATE 
       Session_X_Lobby
       SET lobby_role = ?
       WHERE session_id = ? AND lobby_id = ?`,
      [lobby_role, session_id, lobby_id]
    );

    updateLobby(lobby_id);

    return res.status(200).json({ lobby_role: lobby_role });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.get("/:lobby_id/participants", async function (req, res, next) {
  try {
    const { role_id } = req.query;
    const { lobby_id } = req.params;

    let participants = [];

    if (role_id) {
      const [rows] = await pool.execute(
        `SELECT 
            Session_X_Lobby.session_id,
            display_name,
            lobby_role
          FROM Session_X_Lobby
            INNER JOIN User_Sessions ON Session_X_Lobby.session_id = User_Sessions.session_id
          WHERE lobby_id = ? AND lobby_role = ?
          ORDER BY session_id`,
        [lobby_id, role_id]
      );
      participants = rows;
    } else {
      const [rows] = await pool.execute(
        `SELECT 
          Session_X_Lobby.session_id,
          display_name,
          lobby_role
        FROM Session_X_Lobby
          INNER JOIN User_Sessions ON Session_X_Lobby.session_id = User_Sessions.session_id 
        WHERE lobby_id = ?
        ORDER BY session_id`,
        [lobby_id]
      );
      participants = rows;
    }
    return res.status(200).json(participants);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.post("/:lobby_id/participants", async function (req, res, next) {
  try {
    const { lobby_id } = req.params;
    const { session_id } = req.session;
    // Check if lobby exists
    const [lobby] = await pool.execute(
      `SELECT id, gamestate FROM Lobbies WHERE lobby_id = ?`,
      [lobby_id]
    );

    if (lobby.length === 0) {
      return res.status(404).json({ err: "Unknown Lobby" });
    }

    // Count the number of players in the lobby
    const [count] = await pool.execute(
      `SELECT 
        COUNT(CASE WHEN lobby_role = 0 THEN 1 ELSE NULL END) AS numOfPlayers,
        COUNT(CASE WHEN lobby_role = 1 THEN 1 ELSE NULL END) AS numOfSpectators
        FROM Session_X_Lobby 
        WHERE lobby_id = ?`,
      [lobby_id]
    );

    if (
      count[0].numOfPlayers >= MAX_PLAYERS &&
      count[0].numOfSpectators >= MAX_SPECTATORS
    ) {
      return res.status(200).json({ result: "Lobby full" });
    }

    // Get the lobbies the user joined
    const [lobbies_joined] = await pool.execute(
      `SELECT id, lobby_id FROM Session_X_Lobby WHERE session_id = ?`,
      [session_id]
    );

    // If the user joined another lobby, remove them from the other lobby first before joining this one
    if (lobbies_joined.length > 0 && lobbies_joined[0].lobby_id != lobby_id) {
      await pool.execute(`DELETE FROM Session_X_Lobby WHERE id = ?`, [
        lobbies_joined[0].id,
      ]);

      // If for some reason the user still has the tab open in that lobby, we
      // tell that tab to disconnect
      if (
        longPollLobbies[lobbies_joined[0].lobby_id] != undefined &&
        longPollLobbies[lobbies_joined[0].lobby_id][session_id] != undefined
      ) {
        longPollLobbies[lobbies_joined[0].lobby_id][session_id]
          .status(200)
          .json({ result: "Joined another lobby" });
        delete longPollLobbies[lobbies_joined[0].lobby_id][session_id];
      }
      // Update everyone else in that lobby that someone left
      updateLobby(lobbies_joined[0].lobby_id);

      await pool.execute(
        `INSERT Session_X_Lobby (lobby_id, session_id, lobby_role) 
              VALUES (?, ?, ?);`,
        [
          lobby_id,
          session_id,
          count[0].numOfPlayers >= MAX_PLAYERS || lobby[0].gamestate == 1
            ? 1
            : 0,
        ]
      );
    }
    // If the user is rejoining the same lobby (refreshing)
    else if (
      lobbies_joined.length > 0 &&
      lobbies_joined[0].lobby_id === lobby_id
    ) {
      // If for some reason the user has another tab open in the same lobby, we
      // tell that tab to disconnect
      if (
        longPollLobbies[lobby_id] != undefined &&
        longPollLobbies[lobby_id][session_id] != undefined
      ) {
        longPollLobbies[lobby_id][session_id]
          .status(200)
          .json({ result: "Rejoined the same lobby" });
        delete longPollLobbies[lobbies_joined[0].lobby_id][session_id];
      }
    }
    // If the user has not joined another lobby, join this one
    else if (lobbies_joined.length === 0) {
      await pool.execute(
        `INSERT Session_X_Lobby (lobby_id, session_id, lobby_role) 
              VALUES (?, ?, ?);`,
        [
          lobby_id,
          session_id,
          count[0].numOfPlayers >= MAX_PLAYERS || lobby[0].gamestate == 1
            ? 1
            : 0,
        ]
      );
    }
    // If the user already joined this lobby, do nothing.

    updateLobby(lobby_id);
    return res.status(200).json({ result: "lobby joined" });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

lobbiesRouter.delete(
  "/:lobby_id/participants",
  async function (req, res, next) {
    try {
      const { lobby_id } = req.params;
      const { session_id } = req.session;

      // Check if lobby exists
      const [lobby] = await pool.execute(
        `SELECT id, owner_id, gamestate FROM Lobbies WHERE lobby_id = ?`,
        [lobby_id]
      );

      if (lobby.length === 0) {
        return res.status(400).json({ err: "Unknown Lobby" });
      }

      // If the game is in progress, you can't leave through this api
      if (lobby[0].gamestate === 1) {
        return res.status(200).json({ result: "lobby in game, can't leave" });
      }

      if (lobby[0].owner_id === session_id) {
        const responses = Object.values(longPollLobbies[lobby_id]);
        delete longPollLobbies[lobby_id];
        delete longPollLobbiesLastAccessed[lobby_id];
        for (let res of responses) {
          res.status(200).json({ result: "Owner left" });
        }

        await pool.execute(
          `DELETE 
           FROM Session_X_Lobby
           WHERE lobby_id = ?`,
          [session_id, lobby_id]
        );

        await pool.execute(
          `DELETE 
           FROM Lobbies
           WHERE lobby_id = ?`,
          [lobby_id]
        );
      } else {
        await pool.execute(
          `DELETE 
           FROM Session_X_Lobby
           WHERE session_id = ? AND lobby_id = ?`,
          [session_id, lobby_id]
        );

        if (
          longPollLobbies[lobby_id] != undefined &&
          longPollLobbies[lobby_id][session_id] != undefined
        ) {
          longPollLobbies[lobby_id][session_id]
            .status(200)
            .json({ result: "lobby left" });
          delete longPollLobbies[lobby_id][session_id];
        }

        updateLobby(lobby_id);
      }

      return res.status(200).json({ result: "lobby left" });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ err: err });
    }
  }
);
