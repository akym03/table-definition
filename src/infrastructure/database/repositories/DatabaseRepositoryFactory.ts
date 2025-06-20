import { DatabaseRepository } from '../../../domain/repositories/DatabaseRepository'
import { MySQLDatabaseRepository } from './MySQLDatabaseRepository'
import { PostgreSQLDatabaseRepository } from './PostgreSQLDatabaseRepository'
import { DatabaseConnectionConfig, DatabaseType } from '../../../shared/types/DatabaseType'

/**
 * データベースリポジトリファクトリー
 */
export class DatabaseRepositoryFactory {
  /**
   * 設定に基づいてデータベースリポジトリを作成
   */
  static create(config: DatabaseConnectionConfig): DatabaseRepository {
    switch (config.type) {
      case DatabaseType.MYSQL:
        return new MySQLDatabaseRepository(config)
      case DatabaseType.POSTGRESQL:
        return new PostgreSQLDatabaseRepository(config)
      default:
        throw new Error(`サポートされていないデータベース種類: ${config.type}`)
    }
  }
}
