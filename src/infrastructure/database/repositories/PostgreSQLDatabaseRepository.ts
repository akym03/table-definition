import { DatabaseRepository } from '../../../domain/repositories/DatabaseRepository'
import { Database, createDatabase } from '../../../domain/entities/Database'
import { Table, createTable } from '../../../domain/entities/Table'
import { Column, createColumn } from '../../../domain/entities/Column'
import {
  ReferentialConstraint,
  ConstraintAction,
  createReferentialConstraint,
} from '../../../domain/entities/ReferentialConstraint'
import { DatabaseConnectionConfig } from '../../../shared/types/DatabaseType'
import { DatabaseError } from '../../../shared/errors/AppError'
import { Client } from 'pg'
import { DatabaseInfo, ConstraintRuleType, isValidVersionResult } from '../types/QueryTypes'

// PostgreSQL固有のクエリ結果型定義
interface VersionQueryResult {
  version: string
}

interface TableQueryResult {
  table_name: string
  table_schema: string
}

interface TableCommentQueryResult {
  table_comment: string | null
}

interface ColumnQueryResult {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
}

interface PrimaryKeyQueryResult {
  column_name: string
}

interface UniqueConstraintQueryResult {
  column_name: string
}

interface ColumnCommentQueryResult {
  column_name: string
  column_comment: string | null
}

interface ReferentialConstraintQueryResult {
  constraint_name: string
  source_table: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
  delete_rule: ConstraintRuleType
  update_rule: ConstraintRuleType
}

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

      return createDatabase(
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
    })

    await this.client.connect()
  }

  /**
   * データベース情報を取得
   */
  private async retrieveDatabaseInfo(): Promise<DatabaseInfo> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const versionResult = await this.client.query<VersionQueryResult>('SELECT version()')
    const versionRow = versionResult.rows[0]

    if (!versionRow || !isValidVersionResult(versionRow)) {
      throw new Error('データベースバージョン情報の取得に失敗しました')
    }

    return {
      name: this.config.database,
      version: versionRow.version,
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

    const result = await this.client.query<TableQueryResult>(`
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
      const tableComment = await this.retrieveTableComment(row.table_name)

      const table = createTable(
        row.table_name,
        tableComment,
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

    const result = await this.client.query<ColumnQueryResult>(
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

    // 主キー情報を取得
    const primaryKeys = await this.retrievePrimaryKeys(tableName)
    const primaryKeyColumns = new Set(primaryKeys.map((pk) => pk.column_name))

    // ユニーク制約情報を取得
    const uniqueConstraints = await this.retrieveUniqueConstraints(tableName)
    const uniqueColumns = new Set(uniqueConstraints.map((uc) => uc.column_name))

    // カラムコメント情報を取得
    const columnComments = await this.retrieveColumnComments(tableName)
    const commentMap = new Map(columnComments.map((cc) => [cc.column_name, cc.column_comment]))

    return result.rows.map((row) => {
      return createColumn(
        row.column_name,
        commentMap.get(row.column_name) || null,
        row.data_type,
        row.is_nullable === 'YES',
        row.column_default,
        row.character_maximum_length,
        row.numeric_precision,
        row.numeric_scale,
        primaryKeyColumns.has(row.column_name),
        uniqueColumns.has(row.column_name),
        row.column_default?.includes('nextval') || false
      )
    })
  }

  /**
   * 主キー情報を取得
   */
  private async retrievePrimaryKeys(tableName: string): Promise<PrimaryKeyQueryResult[]> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query<PrimaryKeyQueryResult>(
      `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = $1
      ORDER BY kcu.ordinal_position
    `,
      [tableName]
    )

    return result.rows
  }

  /**
   * ユニーク制約情報を取得
   */
  private async retrieveUniqueConstraints(
    tableName: string
  ): Promise<UniqueConstraintQueryResult[]> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query<UniqueConstraintQueryResult>(
      `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name = $1
      ORDER BY kcu.ordinal_position
    `,
      [tableName]
    )

    return result.rows
  }

  /**
   * 参照整合性制約を取得
   */
  private async retrieveReferentialConstraints(): Promise<ReferentialConstraint[]> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query<ReferentialConstraintQueryResult>(`
      SELECT
        tc.constraint_name,
        tc.table_name as source_table,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.constraint_name
    `)

    return result.rows.map((row) =>
      createReferentialConstraint(
        row.constraint_name,
        row.source_table,
        row.column_name,
        row.foreign_table_name,
        row.foreign_column_name,
        this.mapConstraintAction(row.delete_rule),
        this.mapConstraintAction(row.update_rule),
        true
      )
    )
  }

  /**
   * PostgreSQLの制約アクションをマップ
   */
  private mapConstraintAction(action: ConstraintRuleType): ConstraintAction {
    switch (action) {
      case 'CASCADE':
        return ConstraintAction.CASCADE
      case 'RESTRICT':
        return ConstraintAction.RESTRICT
      case 'SET NULL':
        return ConstraintAction.SET_NULL
      case 'SET DEFAULT':
        return ConstraintAction.SET_DEFAULT
      case 'NO ACTION':
      default:
        return ConstraintAction.NO_ACTION
    }
  }

  /**
   * テーブルコメントを取得
   */
  private async retrieveTableComment(tableName: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query<TableCommentQueryResult>(
      `
      SELECT obj_description(c.oid) as table_comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1 AND n.nspname = 'public'
    `,
      [tableName]
    )

    return result.rows[0]?.table_comment || null
  }

  /**
   * カラムコメントを取得
   */
  private async retrieveColumnComments(tableName: string): Promise<ColumnCommentQueryResult[]> {
    if (!this.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const result = await this.client.query<ColumnCommentQueryResult>(
      `
      SELECT
        a.attname as column_name,
        col_description(a.attrelid, a.attnum) as column_comment
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = $1
        AND n.nspname = 'public'
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `,
      [tableName]
    )

    return result.rows
  }
}
