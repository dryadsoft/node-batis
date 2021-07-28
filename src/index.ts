import chokidar from "chokidar";
import { promises as pfs } from "fs";
import path from "path";
import { parseString } from "xml2js";

/**
 * interface IMapperProps
 */
export interface IMapperProps {
  mapFile: string;
  id: string;
  param?: any;
}

/**
 * interface IStatementProps
 */
export interface IStatementProps {
  _: string;
  $: { id: string };
}

/**
 * interface IMapperProps
 */
export interface IMapperProps {
  select?: IStatementProps[];
  update?: IStatementProps[];
  insert?: IStatementProps[];
  delete?: IStatementProps[];
}
/**
 * interface IXmlProps
 */
export interface IXmlProps {
  mapper: IMapperProps;
}

export type mapperType = "select" | "insert" | "update" | "delete";

class NodeBatis {
  private static instance: NodeBatis;
  private xmlPath: string = "";
  private mapperData: any = "";

  /**
   * constructor
   * @param path xml files directory
   * @param isWatch boolean
   */
  private constructor() {}

  public init(localPath: string, isWatch?: boolean) {
    this.xmlPath = localPath;
    isWatch && this.watch();
  }

  public static getInstance() {
    if (!NodeBatis.instance) {
      console.log("nodebatis start");
      NodeBatis.instance = new NodeBatis();
    }
    return NodeBatis.instance;
  }
  /**
   * getPath
   */
  private getPath(fileName: string) {
    return path.join(this.xmlPath, `${fileName}.xml`);
  }
  /**
   * getExts
   */
  private getExts(localPath: string) {
    return path.parse(localPath).ext;
  }
  /**
   * getFileName
   */
  private getFileName(localPath: string) {
    return path.parse(localPath).name;
  }
  /**
   * async getMapperXml
   */
  private async getMapperXml(localPath: string) {
    // map파일을 읽어온다.
    try {
      const xmlData = await pfs.readFile(localPath, "utf8");
      const data = await this.getXml2Json(xmlData);
      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * async getWatchXmlData
   */
  private async getWatchXmlData(localPath: string) {
    const ext = this.getExts(localPath);
    if (ext === ".xml") {
      const fileName = this.getFileName(localPath);
      // console.log(fileName);
      const data = await this.getMapperXml(localPath);
      // console.log(data);
      const mapperKeys = <mapperType[]>Object.keys(data.mapper);
      const mapperSqlById = mapperKeys.reduce((acc: any, cur) => {
        let statementById: any = {};
        data.mapper[cur]?.forEach((item) => {
          statementById[item.$.id] = item._;
        });
        if (statementById) {
          acc = { ...acc, ...statementById };
        }
        return acc;
      }, {});
      // console.log(mapperSqlById);
      this.mapperData = {
        ...this.mapperData,
        [fileName]: mapperSqlById,
      };
      console.log(this.mapperData);
    }
  }

  /**
   * async getWatchXmlData
   */
  private deleteWatchXmlData(localPath: string) {
    const ext = this.getExts(localPath);
    if (ext === ".xml") {
      const fileName = this.getFileName(localPath);
      delete this.mapperData[fileName];
      // console.log(this.mapperData);
    }
  }

  /**
   * watch
   */
  private watch() {
    const watcher = chokidar.watch(this.xmlPath, {
      ignored: /^\./,
      persistent: true,
    });
    watcher
      .on("add", (localPath: string) => {
        // console.log("add", localPath);
        this.getWatchXmlData(localPath);
      })
      .on("change", (localPath: any) => {
        // console.log("change", localPath);
        this.getWatchXmlData(localPath);
      })
      .on("unlink", (localPath: any) => {
        // console.log("unlink", path);
        this.deleteWatchXmlData(localPath);
      });
  }

  /**
   * async getStatement
   */
  public async getStatement({ mapFile, id, param }: IMapperProps) {
    const sql = this.mapperData[mapFile][id];
    console.log(sql);
    const preparedSql = this.prepareSqlStatement(sql, param);
    return preparedSql;
  }

  /**
   * async getSelectStatement
   */
  public async getSelectStatement({ mapFile, id, param }: IMapperProps) {
    const path = this.getPath(mapFile);
    const {
      mapper: { select },
    }: any = await this.getMapperXml(path);

    const sqlStatement: IStatementProps[] = select.filter(
      (item: any) => item["$"].id === id
    );
    const sql = this.validationSql(sqlStatement, mapFile, id, "select");

    const preparedSql = this.prepareSqlStatement(sql, param);

    return preparedSql;
  }

  /**
   * async getInsertStatement
   */
  public async getInsertStatement({ mapFile, id, param }: IMapperProps) {
    const {
      mapper: { insert },
    }: any = await this.getMapperXml(mapFile);

    const sqlStatement: IStatementProps[] = insert.filter(
      (item: any) => item["$"].id === id
    );
    let sql = this.validationSql(sqlStatement, mapFile, id, "insert");

    const preparedSql = this.prepareSqlStatement(sql, param);

    return preparedSql;
  }

  /**
   * async getUpdateStatement
   */
  public async getUpdateStatement({ mapFile, id, param }: IMapperProps) {
    const {
      mapper: { update },
    }: any = await this.getMapperXml(mapFile);

    const sqlStatement: IStatementProps[] = update.filter(
      (item: any) => item["$"].id === id
    );
    let sql = this.validationSql(sqlStatement, mapFile, id, "update");

    const preparedSql = this.prepareSqlStatement(sql, param);

    return preparedSql;
  }

  /**
   * async getDeleteStatement
   */
  public async getDeleteStatement({ mapFile, id, param }: IMapperProps) {
    const { mapper }: any = await this.getMapperXml(mapFile);

    const sqlStatement: IStatementProps[] = mapper.delete.filter(
      (item: any) => item["$"].id === id
    );
    let sql = this.validationSql(sqlStatement, mapFile, id, "delete");

    const preparedSql = this.prepareSqlStatement(sql, param);

    return preparedSql;
  }

  /**
   * getXml2Json
   */
  private getXml2Json(stringXml: string): Promise<IXmlProps> {
    return new Promise((resolve, reject) => {
      parseString(stringXml, function (err, result) {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  /**
   * validationSql
   */
  private validationSql(
    sqlStatement: IStatementProps[],
    mapFile: string,
    id: string,
    type: string
  ) {
    if (sqlStatement.length === 0) {
      throw `No SqlStatement: ${mapFile}.${type}.${id}`;
    } else if (sqlStatement.length > 1) {
      throw `SqlStatement is duplication:  ${mapFile}.${type}.${id}`;
    }
    console.log(sqlStatement[0]["_"]);
    return sqlStatement[0]["_"];
  }

  /**
   * prepareSqlStatement
   */
  private prepareSqlStatement(sql: string, param: any) {
    if (param) {
      Object.keys(param).forEach((key, index) => {
        if (typeof param[key] === "string") {
          sql = sql.replace(new RegExp(`#{${key}}`, "gi"), `'${param[key]}'`);
        } else {
          sql = sql.replace(new RegExp(`#{${key}}`, "gi"), param[key]);
        }
      });
      console.log(sql);
    }
    return sql;
  }
}

export default NodeBatis;
