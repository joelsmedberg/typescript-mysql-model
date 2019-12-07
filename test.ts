process.env.NODE_ENV = "MODE-DEV";

import { TsBuilder } from "./";
import { Database } from "./test/database";

const output = "./test/database/";

TsBuilder.run(Database.getKnexInstance(), output).then(() => process.exit(0));
