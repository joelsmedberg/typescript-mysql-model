import { StoredProcedureDictionary, StoredProcedure, StoredProcedureParameter } from "./mysql-database-definition";
import * as handlebars from "handlebars";
import * as change_case from "change-case";
const LINE = "let query = `CALL ${name}(${questionMarks});`;   ";
const template = `/**
 * Auto generated, do not modify!
 */
import * as Knex from "Knex";
export default class StoredProcedures {
  constructor(private knex:Knex){

  }

  async callSp(name: string, ...args:any[]):Promise<any>{
    let questionMarks = args.map(item => "?").join(", ");
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
  private compiledTemplate:HandlebarsTemplateDelegate;
  private compiledFunctionTemplate:HandlebarsTemplateDelegate;
  constructor(private procedures: StoredProcedureDictionary, private types:{[key:string]:string}){
    this.compiledTemplate = handlebars.compile(template);
    this.compiledFunctionTemplate = handlebars.compile(fnTemplate);
  }

  renderTemplate():string{
    let strFunctions = [];
    for(let key in this.procedures){
      strFunctions.push(this.renderFunction(this.procedures[key]));
    }
    let input = {strFunctions: strFunctions};
    let output = this.compiledTemplate(input);
    return output;
  }

  private getMySqlType(param:StoredProcedureParameter):string {
    return this.types[param.dataType];
  }

  private toTsParamNotation(param: StoredProcedureParameter):string{    
    return param.parameterName+": " + this.getMySqlType(param);
  }

  private renderFunction(procedure:StoredProcedure):string {
    let params:StoredProcedureParameter[] =[];    
    for(let key in procedure){
      params.push(procedure.parameters[key]);
    }
    params = params.filter(p=>p.parameterMode=="IN");
    params.sort((a,b)=>{return a.ordinalPosition-b.ordinalPosition});

    let commaSepParamNames: string = params.map(p=>p.parameterName).join(", ");
    if(params.length == 0){
      commaSepParamNames = "";      
    }else {
      commaSepParamNames = ", " + commaSepParamNames;
    }
    let typeNameList:string = params.map(p=>this.toTsParamNotation(p)).join(", ");
    let input = {
      name:procedure.name,
      typeNameList: typeNameList,
      commaSepParamNames:commaSepParamNames,
      fnName: change_case.camelCase(procedure.name)
  };
    return this.compiledFunctionTemplate(input);
  }
}