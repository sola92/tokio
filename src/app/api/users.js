import os from "os";

import { wrapAsync, TokioRouter } from "src/lib/express";

const router = new TokioRouter();

router.get(
  "/:id",
  wrapAsync((req, res) => res.send({ username: os.userInfo().username }))
);

export default router;
