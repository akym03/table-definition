import { DatabaseRepository } from '../../../domain/repositories/DatabaseRepository'
import { Database } from '../../../domain/entities/Database'
import { Table } from '../../../domain/entities/Table'
import { Column } from '../../../domain/entities/Column'
import { ReferentialConstraint } from '../../../domain/entities/ReferentialConstraint'
import { DatabaseConnectionConfig } from '../../../shared/types/DatabaseType'
import { DatabaseError } from '../../../shared/errors/AppError'
import { Client } from 'pg'

/**
 * PostgreSQL用データベースリポジトリ実装
 */
export class PostgreSQLDatabaseRepository implements DatabaseRepository {
  private client: Client | null = null

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
    if (this.client) {
      await this.client.end()
      this.client = null
    }
  }

  /**
   * データベースに接続
   */
  private async connect(): Promise<void> {
    if (this.client) {
      return
    }

    this.client = new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl,
    })

    await this.client.connect()
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
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const versionResult = await this.client.query('SELECT version()')
    const version = versionResult.rows[0]?.version || 'Unknown'

    return {
      name: this.config.database,
      version,
      charset: 'UTF8',
      collation: 'en_US.UTF-8',
    }
  }

  /**
   * テーブル一覧を取得
   */
  private async retrieveTables(): Promise<Table[]> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    const tables: Table[] = []

    for (const row of result.rows) {
      const columns = await this.retrieveColumns(row.table_name)
      const constraints = await this.retrieveReferentialConstraints()

      const table = new Table(
        row.table_name,
        null, // PostgreSQLのコメント取得は別途実装が必要
        row.table_schema,
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
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query(
      `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName]
    )

    return result.rows.map((row) => {
      return new Column(
        row.column_name,
        null, // コメント取得は別途実装
        row.data_type,
        row.is_nullable === 'YES',
        row.column_default,
        row.character_maximum_length,
        row.numeric_precision,
        row.numeric_scale,
        false, // 主キー判定は別途実装が必要
        false, // ユニーク判定は別途実装が必要
        row.column_default?.includes('nextval') || false
      )
    })
  }

  /**
   * 参照整合性制約を取得
   */
  private async retrieveReferentialConstraints(): Promise<ReferentialConstraint[]> {
    // PostgreSQL用の制約取得クエリは別途実装が必要
    return []
  }
}
