export const env = "development";

export const dbConfig = {
  host: "localhost",
  user: "root",
  password: "test",
  database: "test",
  port: 3306,
};

export const sslKey = "../server.key";
export const sslCertficate = "../server.crt";

export const allowedOrigins = [
  "https://localhost:3000",
  "https://localhost:4200",
  "https://localhost:8080",
  "https://localhost:443",
  "https://localhost",
];
