import * as changeCase from "change-case";
import * as Handlebars from "handlebars";
import { EnumMatcher } from "./enums/enum-matcher";
import { IDatabaseColumn, IDatabaseSchema, IDatabaseTable } from "./mysql-database-definition";
import { TableClass } from "./table-class";
const template = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */

import { {{imports}} } from "graphql";
{{{extraImportStr}}}

const {{name}}InsertTypeFields = {
  {{insertFields}}
};
const {{name}}SelectTypeFields = {
  {{selectFields}}
};

const {{name}}InputType = new GraphQLInputObjectType({
  fields: {{name}}InsertTypeFields,
  name: "{{name}}Input"
});

const {{name}}Type = new GraphQLObjectType({
  fields: {{name}}SelectTypeFields,
  name: "{{name}}"
});

export { {{name}}Type, {{name}}InputType, {{name}}InsertTypeFields, {{name}}SelectTypeFields };
`
const GRAPH_QL_DATE_TIME = "GraphQLDateTime";
const GRAPH_QL_STRING = "GraphQLString";
export class GraphQlBuilder {
  private matcher = new EnumMatcher();
  public constructor(private schema: IDatabaseSchema) {

  }
  private compiledTemplate = Handlebars.compile(template);
  private readonly mysqlTypes: { [key: string]: string } = {
    blob: "string",
    bigint: "int",
    char: "string",
    date: "datetime",
    enum: "enum",
    datetime: "datetime",
    decimal: "float",
    double: "float",
    float: "float",
    int: "int",
    longblob: "string",
    longtext: "string",
    mediumtext: "string",
    set: "string",
    smallint: "int",
    text: "string",
    timestamp: "datetime",
    tinyint: "boolean",
    varchar: "string"
  };

  public renderTs(table: IDatabaseTable, tableClass: TableClass): string {
    let stdTypes = new Set<string>(["GraphQLObjectType", "GraphQLInputObjectType"]);
    let extraImports = new Set<string>();
    Object.keys(table).forEach(colName => {
      const column = table[colName];
      if (column.enumValues?.length) {
        const eh = this.matcher.run(this.schema, column, tableClass.tableName);
        const importTable = eh?.table!;
        const importColumn = eh?.field!;
        extraImports.add(this.importTableStatement(importTable, [importColumn]));
        return;
      }
      const qlType = this.toGraphType(column.type);
      if (qlType === GRAPH_QL_DATE_TIME) {
        extraImports.add('import { GraphQLDateTime } from "graphql-iso-date";');
      } else {
        stdTypes.add(qlType);
      }
    });
    const rowsInsert = Object.keys(table).map(colName => this.buildTypeRow(table[colName], tableClass, true));
    const rowsSelect = Object.keys(table).map(colName => this.buildTypeRow(table[colName], tableClass, false));
    if (rowsSelect.some(t => t.includes("GraphQLNonNull"))) {
      stdTypes.add("GraphQLNonNull");
    }
    const imports = [...stdTypes].sort().join(", ");
    const extraImportStr = [...extraImports].join("\n");
    const insertFields = rowsInsert.join(", \n \t");
    const selectFields = rowsSelect.join(", \n \t");

    const name = changeCase.pascalCase(tableClass.tableName);
    const t = this.compiledTemplate({ insertFields, selectFields, name, imports, extraImportStr });
    return t;
  }

  private importTableStatement(tableName: string, columnNames: string[]) {
    const PTABLE = changeCase.paramCase(tableName);
    const vars = columnNames.map(c => changeCase.pascalCase(c) + "Enum").join(", ");
    return `import { ${vars} } from "./enums/${PTABLE}-ql-enums.generated";`;
  }

  private toGraphType(mysql: string): string {
    const s = this.mysqlTypes[mysql];
    switch (s) {
      case "string":
        return GRAPH_QL_STRING;
      case "float":
        return "GraphQLFloat"
      case "datetime":
        return GRAPH_QL_DATE_TIME
      case "int":
        return "GraphQLInt"
      case "boolean":
        return "GraphQLBoolean";
      default:
        throw "unknown type " + mysql;
    }
  }

  private buildTypeRow(column: IDatabaseColumn, tableClass: TableClass, insertType: boolean): string {
    let graphType = "";
    if (column.enumValues?.length) {
      const eh = this.matcher.run(this.schema, column, tableClass.tableName);
      const importColumn = eh?.field!;
      graphType = changeCase.pascalCase(importColumn) + "Enum";
    } else {
      graphType = this.toGraphType(column.type);
    }
    if (column.null === "NO" && !insertType) {
      graphType = `GraphQLNonNull(${graphType})`;
    }
    return `${column.field}: { type: ${graphType} }`;
  }
}
