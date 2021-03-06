export class AbstractHandlerBuilder {
  constructor() {

  }

  public getFileContent(): string{
    return `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
import { Database } from "../database";
import { Definition } from "./definition.generated";
import Getter from "./getter.generated";
import Inserter from "./inserter.generated";
import Updater from "./updater.generated";

export abstract class AbstractHandler {
  protected getter: Getter;
  protected updater: Updater;
  protected inserter: Inserter;
  constructor() {
    this.getter = new Getter(Database.getKnexInstance());
    this.updater = new Updater(Database.getKnexInstance(), Definition.schema);
    this.inserter = new Inserter(Database.getKnexInstance());
  }
}
`;
  }
}
