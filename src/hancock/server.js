//@flow
import "./init-db";
import express from "express";
import bodyParser from "body-parser";
import { apiErrorMiddleware } from "src/lib/express";
import transactions from "./transactions";
import pricecheck from "./pricecheck";

export const createApp = () => {
  const app = express();
  // These should run before requests
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use("/transactions", transactions);
  app.use("/price", pricecheck);

  // These should run after requests... place these after route declarations.
  app.use(apiErrorMiddleware());

  return app;
};

if (!module.parent) {
  // this is the main module
  const PORT = 3035;
  const HOST = "0.0.0.0";

  const app = createApp();
  app.listen(PORT, HOST);
  console.log(`Running on http://${HOST}:${PORT}`);
}
