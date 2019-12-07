import { IDatabaseSchema, IDatabaseTable } from "../mysql-database-definition";
import * as changeCase from "change-case";
import * as fs from "fs";
import { QlEnumBuilder } from "./ql-enum-builder";
export interface IEnumHolder { table: string, field: string, options: string[] }
export class EnumBuilder {
  public run(schema: IDatabaseSchema, outputDir: string, qlOutputDir: string) {
    const tableEnums: IEnumHolder[] = [];
    for (const tableKey in schema.tables) {
      const table = schema.tables[tableKey];
      const enums = this.enumArr(table, tableKey)
      tableEnums.push(...enums);
      this.renderEnumString(enums, tableKey, outputDir);
      QlEnumBuilder.render(enums, tableKey, qlOutputDir);
    }
    // for (const tableKey in schema.views) {
    //   const table = schema.views[tableKey];
    //   let enums = this.enumArr(table, tableKey);

    //   this.renderEnumString(enums, tableKey, outputDir);
    // }
  }

  private renderEnumString(enums: IEnumHolder[], tableName: string, outputDir: string) {
    const enumStrArr = enums.map(e => this.createEnum(e.field, e.options));
    if (enumStrArr.length) {
      const wrapper = this.wrapInNameSpace(tableName, enumStrArr);
      const path = outputDir + "/" + changeCase.paramCase(tableName) + ".generated.ts";
      fs.writeFileSync(path, wrapper);
    }
    return enumStrArr;
  }

  private enumArr(table: IDatabaseTable, tableName: string): IEnumHolder[] {
    const enums: IEnumHolder[] = [];
    for (const colKey in table) {
      const column = table[colKey];
      if (column.type === "enum" && column.enumValues) {
        enums.push({
          field: column.field,
          table: tableName,
          options: column.enumValues
        });
      }
    }
    return enums;
  }

  private wrapInNameSpace(table: string, enumStr: string[]) {
    const name = changeCase.constantCase(table);
    return `export namespace ${name} {
  ${enumStr.join("\n\n")}
}`;
  }

  private createEnum(column: string, values: string[]): string {
    // export namespace COMMENT  {
    //   export enum PARENT_TYPE {
    //       STUDENT = "student"
    //   }
    // };
    const rows = values.map(v => `${v} = "${v}"`);
    return `export enum ${changeCase.constantCase(column)} {
\t\t${rows.join(",\n\t\t")}
  }`;
  }
}
