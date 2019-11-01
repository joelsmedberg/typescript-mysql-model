import * as change_case from "change-case";
import * as handlebars from "handlebars";
import { IDatabaseSchema, IDatabaseTable, ITableDictionary } from "./mysql-database-definition";
const template = `/**
 * Auto generated, do not modify!
 */
/* tslint:disable */
export namespace COLUMNS {
    {{#each tables}}{{{this}}}{{/each}}
}
`;

const tableTemplate = `
  export enum {{tableName}} {
    {{{columns}}}
  }
`;

export default class TableColumnsBuilder {
  private compiledTemplate: HandlebarsTemplateDelegate;
  private compiledTableTemplate: HandlebarsTemplateDelegate;
  constructor(private schema: IDatabaseSchema) {
    this.compiledTemplate = handlebars.compile(template);
    this.compiledTableTemplate = handlebars.compile(tableTemplate);
  }

  public renderTemplate(): string {
    const tables: string[] = [];
    tables.push(...this.renderTableTemplates(this.schema.tables));
    tables.push(...this.renderTableTemplates(this.schema.views));
    return this.compiledTemplate({tables: tables});
  }

  private renderColumns(table: IDatabaseTable): string[] {
    const arr: string[] = [];
    for (const key in table) {
      const field: string = table[key].field;
      const constCase = change_case.constantCase(field);
      arr.push(`${constCase} = '${field}'`);
    }
    return arr;
  }

  private renderTableTamplate(tableName: string, table: IDatabaseTable): string {
    const columnsArr = this.renderColumns(table);
    const columns: string = columnsArr.join(", \n\t\t");
    tableName = change_case.constantCase(tableName);
    return this.compiledTableTemplate({tableName: tableName, columns: columns});
  }

  private renderTableTemplates(tables: ITableDictionary): string[] {
    const templates = [];
    for (const key in tables) {
      templates.push(this.renderTableTamplate(key, tables[key]));
    }
    return templates;
  }
}
