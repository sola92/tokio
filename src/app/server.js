//@flow
import express from "express";
import bodyParser from "body-parser";
import { apiErrorMiddleware } from "src/lib/express";
import users from "./api/users";

export const createApp = () => {
  const app = express();
  // These should run before requests
  app.use(express.static("dist"));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use("/api/users", users);

  // These should run after requests... place these after route declarations.
  app.use(apiErrorMiddleware());

  return app;
};

if (!module.parent) {
  // this is the main module
  const PORT = 8080;
  const HOST = "0.0.0.0";

  const app = createApp();
  app.listen(PORT, HOST);
  console.log(`Listening on http://${HOST}:${PORT}!`);
}
