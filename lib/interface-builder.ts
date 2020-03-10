import * as changeCase from "change-case";
import { EnumMatcher } from "./enums/enum-matcher";
import { ISetting } from "./isetting";
import { IDatabaseColumn, IDatabaseSchema, IDatabaseTable } from "./mysql-database-definition";
import { TableClass } from "./table-class";

export interface Dict<value> {
  [key: string]: value;
}

export class InterfaceBuilder {
  private matcher = new EnumMatcher();

  constructor(private settings: ISetting, private mysqlTypes: Dict<string>, private schema: IDatabaseSchema) {

  }

  public renderTs(tableClass: TableClass, table: IDatabaseTable): string {
    const extraImports: IDatabaseColumn[] = [];
    let stringBuilder = this.settings.defaultClassModifier + " " + tableClass.prefixedClassName + " { \n";
    for (const colName in table) {
      const col = table[colName];
      stringBuilder += this.buildTypeRow(col, colName);
      if (this.isEnum(col)) {
        extraImports.push(col);
      }
    }
    stringBuilder += "}\n";
    const importStatements = new Set<string>();
    if (extraImports.length) {
      // if (tableClass.isTable) {
      //   let relativePath = "../enums/" + changeCase.paramCase(tableClass.tableName) + ".generated";
      //   const tableImportArr = [changeCase.constant(tableClass.tableName)];
      //   importStatements.add(this.importStatement(tableImportArr, relativePath));
      // } else {
      const bestMatches = extraImports.map(c => this.matcher.run(this.schema, c, tableClass.tableName)!);
      bestMatches.forEach(b => {
        let relativePath = "../enums/" + changeCase.paramCase(b.table) + ".generated";
        importStatements.add(this.importStatement([changeCase.constant(b.table)], relativePath));
      });
      // }
    }
    const importStr = [...importStatements].join("");
    return this.getMetaText() + "\n" + importStr + "\n" + stringBuilder;
  }

  private importStatement(fieldNames: string[], relativePath: string) {
    return `import { ${fieldNames.join(", ")} } from "${relativePath}"\n`;
  }

  private getMetaText(): string {
    let meta = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
`;
    return meta;
  }

  private buildTypeRow(col: IDatabaseColumn, colName: string): string {
    const tabs = "\t";
    const optional = this.settings.optionalParameters ? "?" : "";
    const tsType = this.getTsType(col, colName);
    const field = col.field;
    return `${tabs}"${field}"${optional}: ${tsType};\n`;
  }
  ;
  private isEnum(col: IDatabaseColumn) {
    return !!col.enumValues?.length;
  }

  private getTsType(col: IDatabaseColumn, colName: string): string {
    if (this.isEnum(col)) {
      // if (tableClass.isTable) {
      //   return changeCase.constantCase(tableClass.tableName) + "." + changeCase.constantCase(col.field);
      // } else {
      const matches = this.matcher.run(this.schema, col, colName);
      if (!matches) {
        throw new Error("No matching column");
      }
      if (matches.replacementFor?.length) {
        return changeCase.constantCase(matches.field);
      }
      return changeCase.constantCase(matches.table!) + "." + changeCase.constantCase(matches.field);
      // }
    }
    let ts = this.mysqlTypes[col.type];
    if (!ts) {
      // tslint:disable-next-line:no-console
      console.error("Unknown type " + col.type);
      return "unknown";
    }
    return ts;
  }
}
