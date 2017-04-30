# typescript-mysql-model

[![npm version](http://img.shields.io/npm/v/typescript-mysql-model.svg)](https://npmjs.org/package/typescript-mysql-model)
[![Dependencies Status](https://david-dm.org/joelsmedberg/typescript-mysql-model.svg)](https://david-dm.org/joelsmedberg/typescript-mysql-model)

  This is an attempt to auto generate a boilerplate for projects using [TypeScript](https://github.com/Microsoft/TypeScript) in combination with MySql. Generating interfaces and ORM-like sturctures allowes the IDE to provide auto-completion and compile time error handling. This project relies heavily on [Knex](https://github.com/tgriesser/knex)


## Installation

    $ npm install typescript-mysql-model --save

## Examples

Just initalize with a knex instance and call respective function to start generating.

```js
import { TsBuilder } from "typescript-mysql-model"
import * as Knex from "knex"

// Create a knex instance
var knex = Knex({
  client: 'mysql',
  connection: {
    host: 'ensembldb.ensembl.org',
    user: 'anonymous',
    password: '',
    database: 'takifugu_rubripes_core_82_4',
  },
});

async function build() {
  // init and call respective function with a folder that exists
  let tsBuilder = await new TsBuilder().init(knex)
  tsBuilder.renderClassFiles('./db/inserter/')
  tsBuilder.renderInserter('./db/inserter/')
  tsBuilder.renderTableFile('./db/')
  tsBuilder.renderViewFile('./db/')
  tsBuilder.renderStoredProcedure('./db/')
  knex.destroy()
}

build()
```
## Example

[Sample project](https://github.com/AntonLapshin/typescript-mysql-model-sample)

## License

MIT
