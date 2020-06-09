import * as handlebars from "handlebars";
import { IDatabaseSchema } from "./mysql-database-definition";
const TEMPLATE = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */

import { DatabaseDefinition } from "typescript-mysql-model";
export class Definition {
  public static readonly schema: DatabaseDefinition.IDatabaseSchema = {{schema}};

}`;

export class DefinitionBuilder {
  private compiledTemplate: HandlebarsTemplateDelegate;

  constructor(private model: IDatabaseSchema) {
    const modelCopy: IDatabaseSchema = JSON.parse(JSON.stringify(model))
    for (const viewName in modelCopy.views) {
      const view = modelCopy.views[viewName];
      for (const colName in view) {
        const col = view[colName];
        delete col.default;
      }
    }
    this.model = modelCopy;
    this.compiledTemplate = handlebars.compile(TEMPLATE, { noEscape: true });
  }

  public renderSchema(): string {
    return this.compiledTemplate({ schema: JSON.stringify(this.model, undefined, 2) });
  }

}
