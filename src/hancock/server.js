//@flow
import "./init-db";
import express from "express";
import bodyParser from "body-parser";
import transactions from "./transactions";
import { apiErrorMiddleware } from "src/lib/express";

export const createApp = () => {
  const app = express();
  app.use("/transactions", transactions);
  app.use(bodyParser.json({ type: "application/*+json" }));
  // Always place this last in the file
  app.use(apiErrorMiddleware());

  return app;
};

if (!module.parent) {
  // this is the main module
  const PORT = 8080;
  const HOST = "0.0.0.0";

  const app = createApp();
  app.listen(PORT, HOST);
  console.log(`Running on http://${HOST}:${PORT}`);
}
