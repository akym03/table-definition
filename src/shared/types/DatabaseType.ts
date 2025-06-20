/**
 * データベースの種類
 */
export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
}

/**
 * データベース接続設定
 */
export interface DatabaseConnectionConfig {
  type: DatabaseType
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  connectionTimeout?: number
  requestTimeout?: number
}

/**
 * データベースメタデータ
 */
export interface DatabaseMetadata {
  name: string
  version: string
  charset: string
  collation: string
}

/**
 * テーブルメタデータ
 */
export interface TableMetadata {
  name: string
  schema: string
  comment: string | null
  engine?: string
  rowCount?: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * カラムメタデータ
 */
export interface ColumnMetadata {
  name: string
  dataType: string
  isNullable: boolean
  defaultValue: string | null
  maxLength: number | null
  precision: number | null
  scale: number | null
  isPrimaryKey: boolean
  isUnique: boolean
  isAutoIncrement: boolean
  comment: string | null
  ordinalPosition: number
}

/**
 * 外部キー制約メタデータ
 */
export interface ForeignKeyMetadata {
  constraintName: string
  sourceTable: string
  sourceColumn: string
  referencedTable: string
  referencedColumn: string
  onDelete: string
  onUpdate: string
  isEnabled: boolean
}
