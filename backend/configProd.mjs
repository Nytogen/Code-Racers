export const env = "production";

export const dbConfig = {
  host: "database",
  user: "root",
  password: "test",
  database: "test",
  port: 3306,
};

export const sslKey = "/etc/letsencrypt/live/nathanielcode.me/privkey.pem";
export const sslCertficate =
  "/etc/letsencrypt/live/nathanielcode.me/fullchain.pem";

export const allowedOrigins = [
  "https://nathanielcode.me",
  "https://nathanielcode.me:443",
];
