import * as changeCase from "change-case";
import * as fs from "fs";
import { IEnumHolder } from "./enum-builder";
import { groupBy, valueToGraphqlCompliant } from "./misc";
export class QlEnumBuilder {
  public static render(enums: IEnumHolder[], outputDir: string): void {
    const dict = groupBy(enums.filter(e => !e.replacedBy), "table");
    const grouped = Object.keys(dict).map(k => dict[k]);
    for (const arr of grouped) {
      const tableName = arr[0].table;
      const intro = `import { GraphQLEnumType } from "graphql";`;
      if (!arr.length) {
        return
      }
      const strExports = arr.map(e => this.createEnum(e.field, e.options)).join("\n\n");
      const output = `${intro}\n\n${strExports}\n`;

      const path = outputDir + "/" + changeCase.paramCase(tableName) + "-ql-enums.generated.ts";
      fs.writeFileSync(path, output);
    }
  }

  private static createEnum(column: string, values: string[]): string {
    const rows = values.map(v => {
      const qlCompliant = valueToGraphqlCompliant(v);
      return `${qlCompliant}: { value: "${v}" }`
    });
    return `const ${changeCase.camel(column)} = new GraphQLEnumType({
  name: "${changeCase.constantCase(column)}",
  values: {
    ${rows.join(",\n\t\t")}
  }
});
    
export { ${changeCase.camel(column)} as ${changeCase.pascal(column)}Enum };`;
  }
}
