import { DatabaseSchema, TableDictionary} from "./mysql-database-definition";
import * as pluralize from "pluralize";
import * as change_case from "change-case";
import { writeFileSync } from "fs";
import { InserterBuilder, TableClass } from "./inserter-builder";
import * as Knex from "knex";
import ModelBuilder from "./model-builder";
import SpBuilder from "./sp-builder";
import InterfaceBuilder from "./interface-builder";
import TableColumnsBuilder from "./table-columns-builder";
/**
 *
 */
export default class TsBuilder {
    mysqlTypes = {
        int: "number",
        decimal: "number",
        double: "number",
        float: "number",
        set: "string",
        bigint: "string",
        longblob: "any",
        tinyint: "boolean",
        date: "Date | string",
        datetime: "Date | string",
        timestamp: "Date | string",
        text: "string",
        longtext: "string",
        mediumtext: "string",
        varchar: "string",
        char: "string"
    };
    settings = {
        singularizeClassNames: true,
        defaultClassName: "export interface",
        optionalParameters: true,
        camelCaseFnNames: true
    }

    constructor(private schema?:DatabaseSchema) {
    }

    static async init(knex:Knex):Promise<TsBuilder>{
        return await new TsBuilder().init(knex);
    }

    async init(knex:Knex, dbName?:string):Promise<TsBuilder> {
        let builder = new ModelBuilder(knex,dbName);
        this.schema = await builder.renderDatabaseSchema();
        return this;
    }

    private toFilename(name:string):string {
        let filename = this.settings.singularizeClassNames ? pluralize.singular(name):name;
        return change_case.paramCase(filename) +".ts";
    }

    private static normFolder(folder:string):string {
        if(!folder) return "";
        if(!(folder.endsWith("/") || folder.endsWith("\\"))) {
            folder += "/";
        }
        return folder;
    }

    renderTableFile(folder:string):void{
        folder = TsBuilder.normFolder(folder);
        let meta = `/**\n* Autogenerated class containing all the tables, DO NOT MODIFY\n*/\n`;
        let start = "export default class Tables { \n";
        let arr = this.listTables().sort().map(t => "\t static " + change_case.constantCase(t) + " = '" + t + "';");
        let content = meta +  start + arr.join("\n") + "\n}";       
        writeFileSync(folder+"tables.ts", content);
    }

    renderViewFile(folder:string):void {
        folder = TsBuilder.normFolder(folder);
        let meta = `/**\n* Autogenerated class containing all the views, DO NOT MODIFY\n*/\n`;
        let start = "export default class Views { \n";
        let arr = this.listViews().sort().map(t => "\tstatic " + change_case.constantCase(t) + " = '" + t + "';");
        let content = meta + start + arr.join("\n") + "\n}";       
        writeFileSync(folder+"views.ts", content); 
    }

    renderColumnsFile(folder:string):void{
        folder = TsBuilder.normFolder(folder);
        let colBuilder = new TableColumnsBuilder(this.schema);
        let content = colBuilder.renderTemplate();
        writeFileSync(folder+"columns.ts", content); 
    }

    renderClassFiles(folder:string, searchString?:string){
        folder = TsBuilder.normFolder(folder);
        let tables = this.listTables(searchString);
        let tableClasses = this.renderClasses(tables, folder);
        let interfaceBuilder = new InterfaceBuilder(this.settings,this.mysqlTypes);
        tableClasses.forEach(tc => {
            let definition = interfaceBuilder.renderTs(tc.tableName, this.schema.tables[tc.tableName]);  
            writeFileSync(tc.fullPath, definition);
        });        
    }

    renderViewClassFiles(folder:string, searchString?:string){
        folder = TsBuilder.normFolder(folder);
        let tables = this.listViews(searchString);
        let interfaceBuilder = new InterfaceBuilder(this.settings,this.mysqlTypes);
        this.renderClasses(tables, folder).forEach(tc => {
            let definition = interfaceBuilder.renderTs(tc.tableName, this.schema.views[tc.tableName]);  
            writeFileSync(tc.fullPath, definition);
        });        
    }

    renderInserter(folder:string, interfaceFolder:string){
        folder = TsBuilder.normFolder(folder);
        let tables = this.listTables();
        let tableClasses = this.renderClasses(tables, interfaceFolder);
        writeFileSync(folder+this.toFilename("inserter"), new InserterBuilder().renderInserter(tableClasses,interfaceFolder));
    }

    renderStoredProcedure(folder:string){
        folder = TsBuilder.normFolder(folder);
        let spBuiler = new SpBuilder(this.schema.storedProcedures,this.mysqlTypes);
        writeFileSync(folder+"stored-procedures.ts", spBuiler.renderTemplate());
    }

    private renderClasses(tables:string[], folder:string):TableClass[]{
        return tables.map(t=>{
            let fnName: string;
            let fnPlural: string;
            let className = this.getClassName(t);
            if(this.settings.camelCaseFnNames){
                fnName = change_case.camelCase(className);
                fnPlural = change_case.camelCase(t)
            }else {
                fnName = className;
                fnPlural = t;
            }

            let filename = this.toFilename(t);  
            return {
                fnName: fnName,
                fnPlural: fnPlural,
                className: this.getClassName(t),
                filename: filename,
                fullPath: folder+filename,
                tableName: t
            } as TableClass
        });   
    }

    private static listTables(tables:TableDictionary ,searchFor:string = null) {
        let views = Object.keys(tables);
        if (searchFor) //Filter search terms if applicable        
            views = views.filter(tName => tName.indexOf(searchFor) > -1);
        return views;
    }    

    private listTables(searchFor:string = null) {
        return TsBuilder.listTables(this.schema.tables,searchFor);
    }

    private listViews(searchFor:string = null) {
        return TsBuilder.listTables(this.schema.views, searchFor);
    }

    private getClassName(tableName: string):string {
        return this.settings.singularizeClassNames ? pluralize.singular(tableName):tableName;        
    }
}
