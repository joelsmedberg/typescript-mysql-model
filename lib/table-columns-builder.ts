import { DatabaseSchema, TableDictionary, DatabaseTable } from "./mysql-database-definition";
import * as handlebars from "handlebars";
import * as change_case from "change-case";
const template = `/**
 * Auto generated, do not modify!
 */
export default class Columns {
    {{#each tables}}{{{this}}}{{/each}}
}
`;

const tableTemplate = `
  static readonly {{tableName}} = {
    {{{columns}}}
  }
`;

export default class TableColumnsBuilder {
  private compiledTemplate:HandlebarsTemplateDelegate;
  private compiledTableTemplate:HandlebarsTemplateDelegate;
  constructor(private schema: DatabaseSchema){
    this.compiledTemplate = handlebars.compile(template);
    this.compiledTableTemplate = handlebars.compile(tableTemplate);
  }

  renderTemplate():string{
    let tables:string[] = [];
    tables.push(...this.renderTableTemplates(this.schema.tables));
    tables.push(...this.renderTableTemplates(this.schema.views));
    let output = this.compiledTemplate({tables:tables});
    return output;
  }

  private renderColumns(table: DatabaseTable):string[]{
    let arr :string[] = [];
    for(let key in table) {
      let field:string = table[key].field;
      let constCase = change_case.constantCase(field);
      arr.push(`${constCase}: '${field}'`);
    }
    return arr;
  }

  private renderTableTamplate(tableName:string, table:DatabaseTable):string {
    let columnsArr = this.renderColumns(table);
    let columns:string = columnsArr.join(", \n\t\t");
    tableName = change_case.constantCase(tableName);
    return this.compiledTableTemplate({tableName:tableName, columns:columns});
  }

  private renderTableTemplates(tables:TableDictionary):string[]{
    let templates = [];
    for(let key in tables){
      templates.push(this.renderTableTamplate(key, tables[key]));
    }
    return templates;
  }
}