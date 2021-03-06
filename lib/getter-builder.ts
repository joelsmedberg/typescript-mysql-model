import * as change_case from "change-case";
import * as handlebars from "handlebars";
import { TableClass } from "./table-class";
import { IDatabaseSchema } from "./mysql-database-definition";
import { SchemaOperator } from "./schema-operator";
const TEMPLATE = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
import * as Knex from "knex";
{{#each imports}}{{{this}}}
{{/each}}

export default class Getter {
    constructor(private knex: Knex) {

    }

    private async getSingle(tableName: string, keyObject: { [key: string]: any }, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder | void): Promise<any> {
        let query = this.knex(tableName).select().limit(1).where(keyObject);
        if (fn) {
            const subQuery = fn(query);
            if(subQuery){
                query = subQuery;
            }
        } 
        const reply: any[] = await query;
        return reply.shift();        
    }

    private async getFromTable(tableName: string, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder | void): Promise<any[]> {
        let query = this.knex(tableName).select();
        if (fn) {
            const subQuery = fn(query);
            if(subQuery){
                query = subQuery;
            }
        }
        return await query;
    }

{{#each getters}}{{{this}}}{{/each}}
{{#each singulars}}{{{this}}}{{/each}}
}`;
const GET_TEMPLATE = `
    public list{{fnName}}(fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder | void): Promise<{{prefixedClassName}}[]> {
        return this.getFromTable("{{tableName}}", fn);
    }
`;
const GET_SINGULAR = `
    public getSingle{{fnName}}({{#each params}}{{{this}}}{{#unless @last}},{{/unless}}{{/each}}, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder | void): Promise<{{prefixedClassName}}> {
        return this.getSingle("{{tableName}}", { {{#each fields}}{{{this}}}{{#unless @last}},{{/unless}}{{/each}} } ,fn);
    }
`;

export class GettersBuilder extends SchemaOperator {
    private compiledTemplate: HandlebarsTemplateDelegate;
    private compiledGetTemplate: HandlebarsTemplateDelegate;
    private compailedGetSingularTemplate: HandlebarsTemplateDelegate;

    constructor(model: IDatabaseSchema, private typeMap: Map<string, string>) {
        super();
        this.definition = model;
        this.compiledTemplate = handlebars.compile(TEMPLATE);
        this.compiledGetTemplate = handlebars.compile(GET_TEMPLATE);
        this.compailedGetSingularTemplate = handlebars.compile(GET_SINGULAR);
    }

    public render(tables: TableClass[], relativePath: string = "./"): string {
        tables = [...tables];

        tables.forEach(t => {
            t.fnName = change_case.upperCaseFirst(t.fnName);
            t.fnPlural = change_case.upperCaseFirst(t.fnPlural);
        });
        tables.sort((a, b) => a.className.localeCompare(b.className));
        const input = {
            getters: tables.map(t => this.compiledGetTemplate(t)).sort(),
            imports: tables.map(t => this.renderImportRow(t, relativePath)).sort(),
            singulars: tables.filter(t => t.isTable).map(t => this.compailedGetSingularTemplate(this.renderGetSingularTemplateInput(t))).sort()
        };
        return this.compiledTemplate(input);
    }

    private renderGetSingularTemplateInput(t: TableClass) {
        let d: any = t;
        d["fields"] = this.getPrimaryKeyNames(t.tableName);
        d["params"] = this.getPkCols(t.tableName).map(col => {
            return col.field + ": " + this.typeMap.get(col.type);
        });
        return d;
    }

    private renderImportRow(table: TableClass, relativePath: string): string {
        table = { ...table };
        table.filename = table.filename.replace(".ts", "");
        return `import {${table.prefixedClassName}} from "${relativePath}${table.filename}"`;
    }
}
