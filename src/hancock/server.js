//@flow
import "./init-db";
import express from "express";
import bodyParser from "body-parser";
import transactions from "./transactions";

const app = express();
app.use(bodyParser.json({ type: "application/*+json" }));

app.use("/transaction", transactions);

const PORT = 8080;
const HOST = "0.0.0.0";
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
