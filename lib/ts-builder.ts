import { DatabaseSchema, DatabaseTable, DatabaseColumn} from "./mysql-database-definition";
import * as pluralize from "pluralize";
import * as change_case from "change-case";
import {writeFileSync} from "fs";
// import {TableClass, InserterBuilder} from "./inserter-builder/inserter-builder";

interface TableClass {
    filename: string;
    fullPath: string;
    tableName: string;
    className: string;
}

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
        varchar: "string"
    };
    
    singularizeClassNames:boolean = true;
    defaultClassName = "export interface";
    optionalParameters = true;

    constructor(private tables:DatabaseSchema, private views:DatabaseSchema) {

    }

    private toFilename(name:string):string {
        let filename = this.singularizeClassNames ? pluralize.singular(name):name;
        return change_case.paramCase(filename) +".ts";
    }

    private static normFolder(folder:string):string {
        if(!folder) return "";
        if(!(folder.endsWith("/") || folder.endsWith("\\"))) {
            folder += "/";
        }
        return folder;
    }
    
    async renderFolder(folder:string, searchString:string=null){
        folder = TsBuilder.normFolder(folder);
        let tables = this.listTables(searchString);
        let tableClasses:TableClass[] = tables.map(t=>{
            let filename = this.toFilename(t);  
            return {
                className: this.getClassName(t),
                filename: filename,
                fullPath: folder+filename,
                tableName: t
            } as TableClass
        });        

        tableClasses.forEach(tc => {
            let definition = this.renderTs(tc.tableName, this.tables[tc.tableName]);  
            writeFileSync(tc.fullPath, definition);
        });
        this.renderTableFile(folder);
        this.renderViewFile(folder);
        // writeFileSync(folder+this.toFilename("inserter", false), new InserterBuilder().renderInserter(tableClasses));
    }

    private getTsType(type: string): string  {
        var ts = this.mysqlTypes[type];
        if (!ts) {
            console.error("Unknown type " + type);
            ts = "any";
        }
        return ts;
    }

    private buildTypeRow(col: DatabaseColumn): string {
        let tabs = "\t";
        let optional = this.optionalParameters?"?":"";
        let tsType = this.getTsType(col.type);
        let field = col.field;
        return `${tabs} "${field}"${optional}: ${tsType};\n`;
    }

    renderTableFile(folder:string):void{
        folder = TsBuilder.normFolder(folder);
        let start = "export default class Tables { \n";
        let arr = this.listTables().map(t => "\t static " + change_case.constantCase(t) + " = '" + t + "';");
        let content = start + arr.join("\n") + "\n}";       
        writeFileSync(folder+"tables.ts", content);
    }

    renderViewFile(folder:string):void {
        folder = TsBuilder.normFolder(folder);
        let start = "export default class Views { \n";
        let arr = this.listViews().map(t => "\t static " + change_case.constantCase(t) + " = '" + t + "';");
        let content = start + arr.join("\n") + "\n}";       
        writeFileSync(folder+"views.ts", content); 
    }

    private static listTables(schema:DatabaseSchema,searchFor:string = null) {
        let views = Object.keys(schema);
        if (searchFor) //Filter search terms if applicable        
            views = views.filter(tName => tName.indexOf(searchFor) > -1);
        return views;
    }    

    private listTables(searchFor:string = null) {
        return TsBuilder.listTables(this.tables,searchFor);
    }

    private listViews(searchFor:string = null) {
        return TsBuilder.listTables(this.views, searchFor);
    }

    private getClassName(tableName: string):string {
        return this.singularizeClassNames ? pluralize.singular(tableName):tableName;        
    }

    private renderTs(tableName: string, table:DatabaseTable):string {
        let className = this.getClassName(tableName);
        var stringBuilder = this.defaultClassName + " " + className + " { \n";
        for (var colName in table) {
            stringBuilder += this.buildTypeRow(table[colName]);
        }        
        stringBuilder += "}";
        return stringBuilder;
    }    
}
