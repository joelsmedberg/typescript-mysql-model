import { IEnumHolder } from "./enum-builder";
import * as changeCase from "change-case";
import * as fs from "fs";
export class QlEnumBuilder {
  public static render(enums: IEnumHolder[], tableName: string, outputDir: string): void {
    const intro = `import { GraphQLEnumType } from "graphql";`;
    if (!enums.length) {
      return
    }
    const strExports = enums.map(e => this.createEnum(e.field, e.options)).join("\n\n");
    const output = `${intro}\n\n${strExports}\n`;

    const path = outputDir + "/" + changeCase.paramCase(tableName) + "-ql-enums.generated.ts";
    fs.writeFileSync(path, output);
  }

  private static createEnum(column: string, values: string[]): string {
    const rows = values.map(v => `${v}: { value: "${v}" }`);
    return `const ${changeCase.camel(column)} = new GraphQLEnumType({
  name: "${changeCase.constantCase(column)}",
  values: {
    ${rows.join(",\n\t\t")}
  }
});
    
export { ${changeCase.camel(column)} as ${changeCase.pascal(column)}Enum };`;
  }
}
