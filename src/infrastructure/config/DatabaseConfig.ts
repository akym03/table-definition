import { DatabaseConnectionConfig, DatabaseType } from '../../shared/types/DatabaseType'
import { ConfigError } from '../../shared/errors/AppError'

/**
 * データベース設定を管理するクラス
 */
export class DatabaseConfig {
  /**
   * 環境変数からデータベース設定を読み込み
   */
  static loadFromEnv(): DatabaseConnectionConfig {
    const type = process.env.DB_TYPE as DatabaseType
    const host = process.env.DB_HOST
    const port = process.env.DB_PORT
    const database = process.env.DB_DATABASE
    const username = process.env.DB_USERNAME
    const password = process.env.DB_PASSWORD
    const ssl = process.env.DB_SSL === 'true'

    if (!type || !host || !port || !database || !username || !password) {
      throw new ConfigError('データベース接続に必要な環境変数が設定されていません')
    }

    if (!Object.values(DatabaseType).includes(type)) {
      throw new ConfigError(`サポートされていないデータベース種類: ${type}`)
    }

    return {
      type,
      host,
      port: parseInt(port, 10),
      database,
      username,
      password,
      ssl,
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
      requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '15000', 10),
    }
  }
}
