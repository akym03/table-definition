import { DatabaseRepository } from '../../../domain/repositories/DatabaseRepository'
import { createMySQLDatabaseRepository } from './MySQLDatabaseRepository'
import { PostgreSQLDatabaseRepository } from './PostgreSQLDatabaseRepository'
import { DatabaseConnectionConfig, DatabaseType } from '../../../shared/types/DatabaseType'

/**
 * 設定に基づいてデータベースリポジトリを作成
 */
export function createDatabaseRepository(config: DatabaseConnectionConfig): DatabaseRepository {
  switch (config.type) {
    case DatabaseType.MYSQL:
      return createMySQLDatabaseRepository(config)
    case DatabaseType.POSTGRESQL:
      return new PostgreSQLDatabaseRepository(config)
    default:
      throw new Error(`サポートされていないデータベース種類: ${config.type}`)
  }
}
