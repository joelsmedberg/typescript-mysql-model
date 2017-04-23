import { DatabaseColumn, DatabaseSchema } from "./mysql-database-definition";
import {format} from 'util';
import Knex = require('knex');

/**
 * This class serves as a data access object and allowes communication with the mysql server
 * It automatically strips away attributes that not match columns
 */
export default class TypedInserter {
    constructor(private dbModel:DatabaseSchema, private knex:Knex){

    }

    async batchInsert<T>(tableName:string, rows:T[]):Promise<void> {
        let stripped = rows.map(row=>this.stripNoneBelonging(tableName,row));
        await this.knex.batchInsert(tableName, stripped, 1000);
    }

    async batchInsertIgnore<T>(tableName:string, rows:T[]):Promise<void> {
        for (let item of rows) {
            await this.insertIgnore(tableName, item);
        }
    }

    async batchUpdate<T>(tableName:string, data:T[]):Promise<void> {
        if (data) {
            for (let item of data) {
                await this.update(tableName, item);
            }
        }
    };

    /**
     * return true if object has its primary key among its items
     * @param tableName
     * @param data
     */
    hasPrimaryKey<T>(tableName: string, data:T):boolean {
        return !!(data[this.getPrimaryKey(tableName)]);
    };

    private async insert<T>(tableName: string, data: T): Promise<T> {   
        var reply = await this.knex(tableName).insert(data);
        data[this.getPrimaryKey(tableName)] = reply[0];
        return data;
    };

    /**
     * Insert an object, if it exist, then silentely ignore and continue
     * @param tableName
     * @param item
     */
    async insertIgnore<T>(tableName: string, item:T):Promise<void> {
        item = this.stripNoneBelonging(tableName, item);
        var qry = this.knex(tableName).insert(item).toString();
        await this.knex.raw(qry.replace("insert", "INSERT IGNORE"));
    };

    async insertOnDuplicateUpdate<T>(tableName: string, data:T) :Promise<void> {
        var filtered = this.stripNoneBelonging(tableName, data);
        let insert = this.knex(tableName).insert(filtered);
        filtered = this.removePrimaryKeys(tableName, filtered);        
        let update = this.knex(tableName).update(filtered);
        let middle = '%s on duplicate key update %s';
        let lastPart = update.toString().replace(/^update `[^`]+` set /i, '');
        let query = format(middle, insert.toString(), lastPart);
        await this.knex.raw(query);
    }

    // /**
    //  * @param tableName 
    //  * @param data
    //  * @param forceInsert
    //  * Insert an object that already has its primary key among its variables
    //  */
    // async insertWithPrimaryKey<T>(tableName:string, data:T, forceInsert?:boolean):Promise<T> {
    //     data = this.stripNoneBelonging(tableName, data);
    //     if (Object.keys(data).length > 1 || forceInsert) {
    //        await this.knex(tableName).insert(data);
    //     }        
    //     return data;
    // }

    /**
     * returns true if the first primary key column is of type int
     * @param tableName
     */
    isIntPk(tableName: string): boolean {
        var pks = this.getPkCols(tableName);
        if (pks.length > 0)
            return pks[0].type == "int";
        return false;
    }

    private getPkCols(tableName:string):DatabaseColumn[] {
        if (!tableName) return null;
        var cols: DatabaseColumn[] = [];
        var table = this.dbModel[tableName];
        for (var key in table) {
            if (table[key].isPrimary) {
                cols.push(table[key]);
            }
        }
        return cols;
    }

    /**
     * List the names of all primary keys in a table
     * @param tableName
     */
    private getPrimaryKeyNames(tableName:string):string[] {
        let cols = this.getPkCols(tableName);
        if (!cols || cols.length == 0) return null;
        return cols.map(col=>col.field);
    }

    /**
     * Returns the name of the first primary key column
     * @param tableName
     */
    getPrimaryKey(tableName: string):string {
        let cols = this.getPkCols(tableName);
        if (cols == null || cols.length == 0) return null;
        return cols[0].field;
    }

    /**
     * @param tableName
     * @param data
     * Return a copy of the object without any primary keys
     */
    removePrimaryKeys<T>(tableName: string, data: T): T {
        var filtered = JSON.parse(JSON.stringify(data)); //copy
        this.getPrimaryKeyNames(tableName).forEach(pk => delete filtered[pk])
        return filtered;
    }

    /**
     * Insert but if the object exists throw the other one away.
     * @param tableName
     * @param item
     */
    async replaceInto<T>(tableName:string, item:T):Promise<void> {
        item = this.stripNoneBelonging(tableName, item);
        let q = this.knex(tableName).insert(item).toString();
        await this.knex.raw(q.replace("insert", "replace"));
    };

    /**
     * Update or insert a data objet.
     * Update if object has a primary key already.
     * To insert an object with a primary key, use the other function
     * @param tableName
     * @param data
     */
    async setData<T>(tableName:string, data:T):Promise<T> {
        data = this.stripNoneBelonging(tableName, data);
        if (this.hasPrimaryKey(tableName, data)) {
            //update existing 
            var pk = this.getPrimaryKey(tableName);
            var pkValue = data[pk];
            return this.update(tableName, data).then(function (reply) {
                data[pk] = pkValue;
                return data;
            });
        } else {
            //new object, insert
            return this.insert(tableName, data);
        }
    }

    /**
     * return a new object where with only attributes that have
     * a corresponding column for given table
     * @param table
     * @param data
     */
    private stripNoneBelonging<T>(tableName:string, data:T): T {
        let table = this.dbModel[tableName];
        let copy = {} as any;
        for (let key in data) {
            if (table[key])
                copy[key] = data[key];
        }
        return copy;
    }

    async forceUpdate<T>(tableName: string, data: T): Promise<T> {
        data = this.stripNoneBelonging(tableName, data);
        return await this.update(tableName, data);
    }

    private async update<T>(tableName:string, data:T):Promise<T> {
        var pks = this.getPrimaryKeyNames(tableName);
        var criterions = {};       
        for(let pk of pks){
            criterions[pk] = data[pk];
            delete data[pk];
        } 
        if (Object.keys(data).length > 0) {
            await this.knex(tableName).where(criterions).update(data);
        }
        return data;
    }
}