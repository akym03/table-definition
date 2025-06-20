/**
 * アプリケーション共通エラークラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'AppError'

    // スタックトレースの調整
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * データベース関連エラー
 */
export class DatabaseError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_ERROR', cause)
    this.name = 'DatabaseError'
  }
}

/**
 * Excel関連エラー
 */
export class ExcelError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'EXCEL_ERROR', cause)
    this.name = 'ExcelError'
  }
}

/**
 * 設定関連エラー
 */
export class ConfigError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause)
    this.name = 'ConfigError'
  }
}
