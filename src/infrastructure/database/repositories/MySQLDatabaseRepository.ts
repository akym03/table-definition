import { DatabaseRepository } from '../../../domain/repositories/DatabaseRepository'
import { Database } from '../../../domain/entities/Database'
import { Table } from '../../../domain/entities/Table'
import { Column } from '../../../domain/entities/Column'
import {
  ReferentialConstraint,
  ConstraintAction,
} from '../../../domain/entities/ReferentialConstraint'
import { DatabaseConnectionConfig } from '../../../shared/types/DatabaseType'
import { DatabaseError } from '../../../shared/errors/AppError'
import mysql from 'mysql2/promise'

// データベースクエリ結果の型定義
interface VersionRow {
  version?: string
}

interface CharsetRow {
  charset?: string
  collation?: string
}

interface TableRow {
  TABLE_NAME: string
  TABLE_SCHEMA: string
  TABLE_COMMENT: string
}

interface ColumnRow {
  COLUMN_NAME: string
  DATA_TYPE: string
  IS_NULLABLE: string
  COLUMN_DEFAULT: string | null
  CHARACTER_MAXIMUM_LENGTH: number | null
  NUMERIC_PRECISION: number | null
  NUMERIC_SCALE: number | null
  COLUMN_KEY: string
  EXTRA: string
  COLUMN_COMMENT: string
}

interface ConstraintRow {
  CONSTRAINT_NAME: string
  COLUMN_NAME: string
  REFERENCED_TABLE_NAME: string
  REFERENCED_COLUMN_NAME: string
  DELETE_RULE: string
  UPDATE_RULE: string
}

/**
 * MySQL用データベースリポジトリ実装
 */
export class MySQLDatabaseRepository implements DatabaseRepository {
  private connection: mysql.Connection | null = null

  constructor(private readonly config: DatabaseConnectionConfig) {}

  /**
   * テーブル定義情報を取得
   */
  async retrieveTableDefinitions(): Promise<Database> {
    try {
      await this.connect()

      const databaseInfo = await this.retrieveDatabaseInfo()
      const tables = await this.retrieveTables()

      return new Database(
        databaseInfo.name,
        databaseInfo.version,
        databaseInfo.charset,
        databaseInfo.collation,
        tables
      )
    } catch (error) {
      throw new DatabaseError(`テーブル定義の取得に失敗しました: ${error}`)
    }
  }

  /**
   * 接続をテスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect()
      return true
    } catch {
      return false
    }
  }

  /**
   * 接続を閉じる
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end()
      this.connection = null
    }
  }

  /**
   * データベースに接続
   */
  private async connect(): Promise<void> {
    if (this.connection) {
      return
    }

    this.connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl,
    })
  }

  /**
   * データベース情報を取得
   */
  private async retrieveDatabaseInfo(): Promise<{
    name: string
    version: string
    charset: string
    collation: string
  }> {
    if (!this.connection) {
      throw new Error('データベース接続が確立されていません')
    }

    const [versionRows] = await this.connection.execute('SELECT VERSION() as version')
    const [charsetRows] = await this.connection.execute(
      `
      SELECT DEFAULT_CHARACTER_SET_NAME as charset, DEFAULT_COLLATION_NAME as collation
      FROM INFORMATION_SCHEMA.SCHEMATA
      WHERE SCHEMA_NAME = ?
    `,
      [this.config.database]
    )

    const versionData = versionRows satisfies VersionRow[]
    const charsetData = charsetRows satisfies CharsetRow[]

    const version = versionData[0]?.version || 'Unknown'
    const charset = charsetData[0]?.charset || 'utf8mb4'
    const collation = charsetData[0]?.collation || 'utf8mb4_general_ci'

    return {
      name: this.config.database,
      version,
      charset,
      collation,
    }
  }

  /**
   * テーブル一覧を取得
   */
  private async retrieveTables(): Promise<Table[]> {
    if (!this.connection) {
      throw new Error('データベース接続が確立されていません')
    }

    const [tableRows] = await this.connection.execute(
      `
      SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `,
      [this.config.database]
    )

    const tables: Table[] = []
    const tableData = tableRows satisfies TableRow[]

    for (const tableRow of tableData) {
      const columns = await this.retrieveColumns(tableRow.TABLE_NAME)
      const constraints = await this.retrieveReferentialConstraints(tableRow.TABLE_NAME)

      const table = new Table(
        tableRow.TABLE_NAME,
        tableRow.TABLE_COMMENT,
        tableRow.TABLE_SCHEMA,
        columns,
        constraints
      )

      tables.push(table)
    }

    return tables
  }

  /**
   * カラム一覧を取得
   */
  private async retrieveColumns(tableName: string): Promise<Column[]> {
    if (!this.connection) {
      throw new Error('データベース接続が確立されていません')
    }

    const [columnRows] = await this.connection.execute(
      `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_KEY,
        EXTRA,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `,
      [this.config.database, tableName]
    )

    const columnData = columnRows satisfies ColumnRow[]

    return columnData.map((row) => {
      return new Column(
        row.COLUMN_NAME,
        row.COLUMN_COMMENT,
        row.DATA_TYPE,
        row.IS_NULLABLE === 'YES',
        row.COLUMN_DEFAULT,
        row.CHARACTER_MAXIMUM_LENGTH,
        row.NUMERIC_PRECISION,
        row.NUMERIC_SCALE,
        row.COLUMN_KEY === 'PRI',
        row.COLUMN_KEY === 'UNI',
        row.EXTRA?.includes('auto_increment') || false
      )
    })
  }

  /**
   * 参照整合性制約を取得
   */
  private async retrieveReferentialConstraints(
    tableName: string
  ): Promise<ReferentialConstraint[]> {
    if (!this.connection) {
      throw new Error('データベース接続が確立されていません')
    }

    const [constraintRows] = await this.connection.execute(
      `
      SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME,
        DELETE_RULE,
        UPDATE_RULE
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        AND kcu.TABLE_SCHEMA = rc.UNIQUE_CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = ? AND kcu.TABLE_NAME = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `,
      [this.config.database, tableName]
    )

    const constraintData = constraintRows satisfies ConstraintRow[]

    return constraintData.map((row) => {
      return new ReferentialConstraint(
        row.CONSTRAINT_NAME,
        tableName,
        row.COLUMN_NAME,
        row.REFERENCED_TABLE_NAME,
        row.REFERENCED_COLUMN_NAME,
        this.mapConstraintAction(row.DELETE_RULE),
        this.mapConstraintAction(row.UPDATE_RULE)
      )
    })
  }

  /**
   * 制約アクションをマッピング
   */
  private mapConstraintAction(action: string): ConstraintAction {
    switch (action?.toUpperCase()) {
      case 'CASCADE':
        return ConstraintAction.CASCADE
      case 'RESTRICT':
        return ConstraintAction.RESTRICT
      case 'SET NULL':
        return ConstraintAction.SET_NULL
      case 'SET DEFAULT':
        return ConstraintAction.SET_DEFAULT
      case 'NO ACTION':
        return ConstraintAction.NO_ACTION
      default:
        return ConstraintAction.RESTRICT
    }
  }
}
