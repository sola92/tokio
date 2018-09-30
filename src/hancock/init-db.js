//@flow
/* eslint-disable new-cap */

import Knex from "knex";
import { Model } from "objection";
import { development as KnexDev } from "./knexfile";

// Bind all Models to a knex instance. If you only have one database in
// your server this is all you have to do. For multi database systems, see
// the Model.bindKnex method.
export const knex = Knex(KnexDev);

Model.knex(knex);
