import * as change_case from "change-case";
import * as handlebars from "handlebars";
import { TableClass } from "./table-class";
const TEMPLATE = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
import Knex = require("knex");
import { IDatabaseSchema } from "typescript-mysql-model/lib/mysql-database-definition";
import { SchemaOperator } from "typescript-mysql-model";
{{#each imports}}{{{this}}}
{{/each}}

export default class Updater extends SchemaOperator {

  public constructor(private knex: Knex, definition: IDatabaseSchema) {
    super();
    this.definition = definition;
  }

  protected async runQuery(q: Knex.QueryBuilder) {
    await q;
  }

  protected async update<T extends { [key: string]: any }>(tableName: string,
    data: T, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<T> {
    const criterions: { [key: string]: any } = this.retainPrimaryKeys(tableName, data);
    data = this.removePrimaryKeys(tableName, data);
    if (Object.keys(data).length > 0) {
      let query = this.knex(tableName).where(criterions).update(data);
      if (fn) {
        query = fn(query);
      }
      await this.runQuery(query);
    }
    return data;
  }
{{#each updaters}}{{{this}}}{{/each}}
}`;
const UPDATE_TEMPLATE = `
    public update{{fnName}}(item: {{className}}UpdateType, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<{{className}}UpdateType> {
      return this.update("{{tableName}}", item, fn);
    }
`;

export class UpdateBuilder {
  private compiledTemplate: HandlebarsTemplateDelegate;
  private compiledUpdateTemplate: HandlebarsTemplateDelegate;

  constructor() {
    this.compiledTemplate = handlebars.compile(TEMPLATE);
    this.compiledUpdateTemplate = handlebars.compile(UPDATE_TEMPLATE);
  }

  public renderUpdater(tables: TableClass[], relativePath: string = "./"): string {
    tables = JSON.parse(JSON.stringify(tables));
    tables.forEach(t => {
      t.fnName = change_case.upperCaseFirst(t.fnName);
      t.fnPlural = change_case.upperCaseFirst(t.fnPlural);
    });
    const input = {
      updaters: tables.map(t => this.compiledUpdateTemplate(t)).sort(),
      imports: tables.map(t => this.renderImportRow(t, relativePath)).sort()
    };
    return this.compiledTemplate(input);
  }

  private renderImportRow(table: TableClass, relativePath: string): string {
    table = JSON.parse(JSON.stringify(table));
    table.filename = table.filename.replace(".ts", "");
    return `import { ${table.className}UpdateType } from "${relativePath}${table.filename}"`;
  }
}
