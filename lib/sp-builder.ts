import * as change_case from "change-case";
import * as handlebars from "handlebars";
import { IStoredProcedure, IStoredProcedureDictionary, IStoredProcedureParameter } from "./mysql-database-definition";
const LINE = "let query = `CALL ${name}(${questionMarks});`;   ";
const template = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
import * as Knex from "knex";
export default class StoredProcedures {
  constructor(private knex:Knex){

  }

  async callSp(name: string, ...args:any[]):Promise<any>{
    let questionMarks = args.map(() => "?").join(", ");
    ${LINE}
    let resp = await this.knex.raw(query,args);
    return resp[0][0];
  }
  {{#each strFunctions}}{{{this}}}{{/each}}
}
`;

const fnTemplate = `
  async {{{fnName}}}({{{typeNameList}}}):Promise<any>{
    return await this.callSp("{{{name}}}"{{{commaSepParamNames}}});
  }
`;

export default class SpBuilder {
  private compiledTemplate: HandlebarsTemplateDelegate;
  private compiledFunctionTemplate: HandlebarsTemplateDelegate;
  constructor(private procedures: IStoredProcedureDictionary, private types: { [key: string]: string }) {
    this.compiledTemplate = handlebars.compile(template);
    this.compiledFunctionTemplate = handlebars.compile(fnTemplate);
  }

  public renderTemplate(): string {
    const strFunctions = [];
    for (const key in this.procedures) {
      strFunctions.push(this.renderFunction(this.procedures[key]));
    }
    const input = { strFunctions: strFunctions };
    const output = this.compiledTemplate(input);
    return output;
  }

  private getMySqlType(param: IStoredProcedureParameter): string {
    return this.types[param.dataType];
  }

  private toTsParamNotation(param: IStoredProcedureParameter): string {
    return param.parameterName + ": " + this.getMySqlType(param);
  }

  private renderFunction(procedure: IStoredProcedure): string {
    let params: IStoredProcedureParameter[] = [];
    for (const key in procedure.parameters) {
      params.push(procedure.parameters[key]);
    }
    params = params.filter(p => p.parameterMode === "IN");
    params.sort((a, b) => {
      return a.ordinalPosition - b.ordinalPosition;
    });

    let commaSepParamNames: string = params.map(p => p.parameterName).join(", ");
    if (params.length === 0) {
      commaSepParamNames = "";
    } else {
      commaSepParamNames = ", " + commaSepParamNames;
    }
    const typeNameList: string = params.map(p => this.toTsParamNotation(p)).join(", ");
    const input = {
      commaSepParamNames: commaSepParamNames,
      fnName: change_case.camelCase(procedure.name),
      name: procedure.name,
      typeNameList: typeNameList
    };
    return this.compiledFunctionTemplate(input);
  }
}
