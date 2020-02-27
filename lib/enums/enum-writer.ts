import * as changeCase from "change-case";
import * as fs from "fs";
import { IEnumHolder } from "./enum-builder";
import { groupBy } from "./misc";
import { QlEnumBuilder } from "./ql-enum-builder";

export class EnumWriter {
  public run(enums: IEnumHolder[], outputDir: string, qlOutputDir: string) {
    this.renderEnumString(enums, outputDir);
    QlEnumBuilder.render(enums, qlOutputDir);
  }

  private renderEnumString(enums: IEnumHolder[], outputDir: string) {
    const dict = groupBy(enums.filter(e => !e.replacedBy), "table");
    const grouped = Object.keys(dict).map(k => dict[k]);

    for (const arr of grouped) {
      const tableName = arr[0].table;
      const enumStrArr = arr.map(e => this.createEnum(e.field, e.options));
      if (enumStrArr.length) {
        let wrapper = this.wrapInNameSpace(tableName, enumStrArr);
        if (enumStrArr.length === 1 && arr[0].replacementFor?.length) {
          wrapper = enumStrArr[0];
        }
        const path = outputDir + "/" + changeCase.paramCase(tableName) + ".generated.ts";
        fs.writeFileSync(path, wrapper);
      }
    }
  }

  private wrapInNameSpace(table: string, enumStr: string[]) {
    const name = changeCase.constantCase(table);
    return `export namespace ${name} {
  ${enumStr.join("\n\n")}
}`;
  }

  private createEnum(column: string, values: string[]): string {
    const rows = values.map(v => `${v} = "${v}"`);
    return `export enum ${changeCase.constantCase(column)} {
\t\t${rows.join(",\n\t\t")}
  }`;
  }
}
