//
// Copyright © 2020 Province of British Columbia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Created by Jason Leach on 2020-04-21.
//

import { logger, started } from "@bcgov/common-nodejs-utils";
import config from "./config";
import app from "./index";

const env = config.get("environment");
const port = config.get("port");

app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    return logger.error(
      `There was a problem starting the server, ${err.message}`
    );
  }
  if (env !== "production") {
    return started(port);
  }
  return logger.info(`Production server running on port: ${port}`);
});

module.exports = app;
