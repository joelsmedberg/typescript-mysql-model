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
    const maybeEquals = tableClass.useInterface === "type" ? "=" : "";
    let stringBuilder = `${this.settings.defaultClassModifier} ${tableClass.useInterface} ${tableClass.prefixedClassName} ${maybeEquals} { \n`;
    for (const colName in table) {
      const col = table[colName];
      stringBuilder += this.variableTypeRow(col, colName);
      if (this.isEnum(col)) {
        extraImports.push(col);
      }
    }
    stringBuilder += "}\n";
    const importStatements = new Set<string>();
    if (extraImports.length) {
      const bestMatches = extraImports.map(c => this.matcher.run(this.schema, c, tableClass.tableName)!);
      bestMatches.forEach(b => {
        let relativePath = "../enums/" + changeCase.paramCase(b.table) + ".generated";
        importStatements.add(this.importStatement([changeCase.constant(b.table)], relativePath));
      });
    }
    const inputSection = tableClass.isTable ? "\n\n" + this.renderInsertType(tableClass, table) + "\n\n" + this.renderUpdateType(tableClass, table) : "";
    const importStr = [...importStatements].join("");
    return this.getMetaText() + "\n" + importStr + "\n" + stringBuilder + inputSection;
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

  private variableTypeRow(col: IDatabaseColumn, colName: string): string {
    const tabs = "\t";
    const optional = this.settings.optionalParameters ? "?" : "";
    const tsType = this.getTsType(col, colName);
    const field = col.field;
    return `${tabs}${field}${optional}: ${tsType};\n`;
  }

  private variableTypeRowInsertItem(col: IDatabaseColumn, colName: string): string {
    const tabs = "\t";
    const optional = (col.null === "YES" || col.default !== null) ? "?" : "";
    const tsType = this.getTsType(col, colName);
    const field = col.field;
    return `${tabs}${field}${optional}: ${tsType};\n`;
  }

  private variableTypeRowUpdateItem(col: IDatabaseColumn, colName: string): string {
    const tabs = "\t";
    const optional = (col.isPrimary) ? "" : "?";
    const tsType = this.getTsType(col, colName);
    const field = col.field;
    return `${tabs}${field}${optional}: ${tsType};\n`;
  }

  private isEnum(col: IDatabaseColumn) {
    return !!col.enumValues?.length;
  }

  private getTsType(col: IDatabaseColumn, colName: string): string {
    const maybeNull = col.null === "YES" ? " | null" : "";
    if (this.isEnum(col)) {
      const matches = this.matcher.run(this.schema, col, colName);
      if (!matches) {
        throw new Error("No matching column");
      }
      if (matches.replacementFor?.length) {
        return changeCase.constantCase(matches.field) + maybeNull;
      }
      return changeCase.constantCase(matches.table!) + "." + changeCase.constantCase(matches.field) + maybeNull;
    }
    let ts = this.mysqlTypes[col.type];
    if (!ts) {
      // tslint:disable-next-line:no-console
      console.error("Unknown type " + col.type);
      return "unknown";
    }
    return ts + maybeNull;
  }

  public renderUpdateType(tableClass: TableClass, table: IDatabaseTable): string {
    const maybeEquals = tableClass.useInterface === "type" ? "=" : "";
    let stringBuilder = `${this.settings.defaultClassModifier} ${tableClass.useInterface} ${tableClass.className}UpdateType ${maybeEquals} { \n`;
    for (const colName in table) {
      const col = table[colName];
      if (col.default !== "CURRENT_TIMESTAMP") {
        stringBuilder += this.variableTypeRowUpdateItem(col, colName);
      }
    }
    stringBuilder += "}\n";
    return stringBuilder;
  }

  public renderInsertType(tableClass: TableClass, table: IDatabaseTable): string {
    const maybeEquals = tableClass.useInterface === "type" ? "=" : "";
    let stringBuilder = `${this.settings.defaultClassModifier} ${tableClass.useInterface} ${tableClass.className}InsertType ${maybeEquals} { \n`;
    for (const colName in table) {
      const col = table[colName];
      const remove = col.extra === "auto_increment" || col.default === "CURRENT_TIMESTAMP";
      if (!remove) {
        stringBuilder += this.variableTypeRowInsertItem(col, colName);
      }
    }
    stringBuilder += "}\n";
    return stringBuilder;
  }
}
