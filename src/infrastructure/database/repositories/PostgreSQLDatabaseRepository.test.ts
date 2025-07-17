import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSQLDatabaseRepository } from './PostgreSQLDatabaseRepository'
import { DatabaseConnectionConfig, DatabaseType } from '@/shared/types/DatabaseType'
import { ConstraintAction } from '@/domain/entities/ReferentialConstraint'
import {
  getPhysicalName as getTablePhysicalName,
  getLogicalName as getTableLogicalName,
  getComment as getTableComment,
} from '@/domain/entities/Table'
import {
  getPhysicalName as getColumnPhysicalName,
  getLogicalName as getColumnByLogicalName,
  getComment as getColumnComment,
  isEnumColumn,
  getEnumValues,
  getEnumValueCount,
} from '@/domain/entities/Column'

describe('PostgreSQLDatabaseRepository 統合テスト', () => {
  const testConfig: DatabaseConnectionConfig = {
    type: DatabaseType.POSTGRESQL,
    host: 'localhost',
    port: 5432,
    username: 'testuser',
    password: 'testpassword',
    database: 'test_database',
  }

  let repository: PostgreSQLDatabaseRepository

  beforeAll(() => {
    repository = new PostgreSQLDatabaseRepository(testConfig)
  })

  afterAll(async () => {
    await repository.close()
  })

  describe('接続テスト', () => {
    it('正常な接続設定でテスト接続が成功する', async () => {
      const result = await repository.testConnection()
      expect(result).toBe(true)
    })

    it('不正な接続設定でテスト接続が失敗する', async () => {
      const invalidRepository = new PostgreSQLDatabaseRepository({
        ...testConfig,
        password: 'invalid_password',
      })

      const result = await invalidRepository.testConnection()
      expect(result).toBe(false)

      await invalidRepository.close()
    })
  })

  describe('データベース定義取得', () => {
    it('データベース情報を正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()

      expect(database.name).toBe('test_database')
      expect(database.version).toContain('PostgreSQL')
      expect(database.charset).toBeDefined()
      expect(database.collation).toBeDefined()
      expect(database.tables).toBeDefined()
      expect(database.tables.length).toBeGreaterThan(0)
    })

    it('期待されるテーブルが全て取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const tableNames = database.tables.map((table) => getTablePhysicalName(table)).sort()

      const expectedTables = [
        'audit_logs',
        'categories',
        'customers',
        'departments',
        'employees',
        'expenses',
        'inventory',
        'order_items',
        'orders',
        'product_movements',
        'product_tags',
        'products',
        'project_members',
        'projects',
        'store_departments',
        'tags',
      ]

      expect(tableNames).toEqual(expectedTables)
    })
  })

  describe('テーブル情報取得', () => {
    it('customersテーブルの基本情報を正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )

      expect(customersTable).toBeDefined()
      expect(customersTable!.schema).toBe('public')
      expect(customersTable!.columns.length).toBeGreaterThan(0)
    })

    it('テーブルの物理名・論理名・コメントが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )

      expect(customersTable).toBeDefined()
      // 物理名のテスト
      expect(getTablePhysicalName(customersTable!)).toBe('customers')
      // 論理名のテスト（コメントから取得）
      expect(getTableLogicalName(customersTable!)).toBe('顧客マスタ')
      // コメントのテスト
      expect(getTableComment(customersTable!)).toBe('')
    })

    it('自己参照外部キーテーブル（employees）の基本情報が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const employeesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'employees'
      )

      expect(employeesTable).toBeDefined()
      expect(employeesTable!.schema).toBe('public')
      expect(getTablePhysicalName(employeesTable!)).toBe('employees')
      expect(getTableLogicalName(employeesTable!)).toBe('従業員マスタ')
      expect(getTableComment(employeesTable!)).toBe('（自己参照外部キーテスト用）')
      expect(employeesTable!.columns.length).toBeGreaterThan(0)
    })

    it('階層構造テーブル（departments）の基本情報が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const departmentsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'departments'
      )

      expect(departmentsTable).toBeDefined()
      expect(departmentsTable!.schema).toBe('public')
      expect(getTablePhysicalName(departmentsTable!)).toBe('departments')
      expect(getTableLogicalName(departmentsTable!)).toBe('部門マスタ')
      expect(getTableComment(departmentsTable!)).toBe('（SET DEFAULT ON UPDATEテスト用）')
      expect(departmentsTable!.columns.length).toBeGreaterThan(0)
    })

    it('複雑な制約チェーンテーブル（projects）の基本情報が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const projectsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'projects'
      )

      expect(projectsTable).toBeDefined()
      expect(projectsTable!.schema).toBe('public')
      expect(getTablePhysicalName(projectsTable!)).toBe('projects')
      expect(getTableLogicalName(projectsTable!)).toBe('プロジェクトマスタ')
      expect(getTableComment(projectsTable!)).toBe('（複雑な参照整合性連鎖テスト用）')
      expect(projectsTable!.columns.length).toBeGreaterThan(0)
    })

    it('多対多関係テーブル（project_members）の基本情報が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const projectMembersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'project_members'
      )

      expect(projectMembersTable).toBeDefined()
      expect(projectMembersTable!.schema).toBe('public')
      expect(getTablePhysicalName(projectMembersTable!)).toBe('project_members')
      expect(getTableLogicalName(projectMembersTable!)).toBe('プロジェクトメンバーテーブル')
      expect(getTableComment(projectMembersTable!)).toBe('（多対多関係、複雑な制約テスト用）')
      expect(projectMembersTable!.columns.length).toBeGreaterThan(0)
    })

    it('複雑な制約組み合わせテーブル（expenses）の基本情報が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const expensesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'expenses'
      )

      expect(expensesTable).toBeDefined()
      expect(expensesTable!.schema).toBe('public')
      expect(getTablePhysicalName(expensesTable!)).toBe('expenses')
      expect(getTableLogicalName(expensesTable!)).toBe('経費テーブル')
      expect(getTableComment(expensesTable!)).toBe(
        '（SET DEFAULT ON UPDATEとNO ACTION制約の組み合わせテスト用）'
      )
      expect(expensesTable!.columns.length).toBeGreaterThan(0)
    })

    it('参照整合性制約なしテーブル（audit_logs）の基本情報が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const auditLogsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'audit_logs'
      )

      expect(auditLogsTable).toBeDefined()
      expect(auditLogsTable!.schema).toBe('public')
      expect(getTablePhysicalName(auditLogsTable!)).toBe('audit_logs')
      expect(getTableLogicalName(auditLogsTable!)).toBe('監査ログテーブル')
      expect(getTableComment(auditLogsTable!)).toBe('（参照整合性制約なしの履歴テーブル）')
      expect(auditLogsTable!.columns.length).toBeGreaterThan(0)
    })
  })

  describe('カラム情報取得', () => {
    it('SERIAL型・主キー・自動増分カラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )!

      const idColumn = customersTable.columns.find((col) => getColumnPhysicalName(col) === 'id')!

      // 基本プロパティ
      expect(getColumnPhysicalName(idColumn)).toBe('id')
      expect(getColumnByLogicalName(idColumn)).toBe('顧客ID')
      expect(getColumnComment(idColumn)).toBe('')
      expect(idColumn.dataType).toBe('integer')
      expect(idColumn.isNullable).toBe(false)
      expect(idColumn.defaultValue).toBe("nextval('customers_id_seq'::regclass)")
      expect(idColumn.maxLength).toBe(null)
      expect(idColumn.precision).toBe(32)
      expect(idColumn.scale).toBe(0)
      expect(idColumn.isPrimaryKey).toBe(true)
      expect(idColumn.isUnique).toBe(false)
      expect(idColumn.isAutoIncrement).toBe(true)
      expect(idColumn.foreignKeyConstraint).toBe(null)
    })

    it('VARCHAR型・UNIQUE制約カラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )!

      const emailColumn = customersTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'email'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(emailColumn)).toBe('email')
      expect(getColumnByLogicalName(emailColumn)).toBe('メールアドレス')
      expect(getColumnComment(emailColumn)).toBe('')
      expect(emailColumn.dataType).toBe('character varying')
      expect(emailColumn.isNullable).toBe(false)
      expect(emailColumn.defaultValue).toBe(null)
      expect(emailColumn.maxLength).toBe(255)
      expect(emailColumn.precision).toBe(null)
      expect(emailColumn.scale).toBe(null)
      expect(emailColumn.isPrimaryKey).toBe(false)
      expect(emailColumn.isUnique).toBe(true)
      expect(emailColumn.isAutoIncrement).toBe(false)
      expect(emailColumn.foreignKeyConstraint).toBe(null)
    })

    it('NUMERIC型カラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'products'
      )!

      const priceColumn = productsTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'price'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(priceColumn)).toBe('price')
      expect(getColumnByLogicalName(priceColumn)).toBe('価格')
      expect(getColumnComment(priceColumn)).toBe('')
      expect(priceColumn.dataType).toBe('numeric')
      expect(priceColumn.isNullable).toBe(false)
      expect(priceColumn.defaultValue).toBe(null)
      expect(priceColumn.maxLength).toBe(null)
      expect(priceColumn.precision).toBe(10)
      expect(priceColumn.scale).toBe(2)
      expect(priceColumn.isPrimaryKey).toBe(false)
      expect(priceColumn.isUnique).toBe(false)
      expect(priceColumn.isAutoIncrement).toBe(false)
      expect(priceColumn.foreignKeyConstraint).toBe(null)
    })

    it('NULL許可・デフォルト値ありカラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'products'
      )!

      const stockColumn = productsTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'stock_quantity'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(stockColumn)).toBe('stock_quantity')
      expect(getColumnByLogicalName(stockColumn)).toBe('在庫数')
      expect(getColumnComment(stockColumn)).toBe('')
      expect(stockColumn.dataType).toBe('integer')
      expect(stockColumn.isNullable).toBe(true)
      expect(stockColumn.defaultValue).toBe('0')
      expect(stockColumn.maxLength).toBe(null)
      expect(stockColumn.precision).toBe(32)
      expect(stockColumn.scale).toBe(0)
      expect(stockColumn.isPrimaryKey).toBe(false)
      expect(stockColumn.isUnique).toBe(false)
      expect(stockColumn.isAutoIncrement).toBe(false)
      expect(stockColumn.foreignKeyConstraint).toBe(null)
    })

    it('BOOLEAN型カラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'products'
      )!

      const isActiveColumn = productsTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'is_active'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(isActiveColumn)).toBe('is_active')
      expect(getColumnByLogicalName(isActiveColumn)).toBe('有効フラグ')
      expect(getColumnComment(isActiveColumn)).toBe('')
      expect(isActiveColumn.dataType).toBe('boolean')
      expect(isActiveColumn.isNullable).toBe(true)
      expect(isActiveColumn.defaultValue).toBe('true')
      expect(isActiveColumn.maxLength).toBe(null)
      expect(isActiveColumn.precision).toBe(null)
      expect(isActiveColumn.scale).toBe(null)
      expect(isActiveColumn.isPrimaryKey).toBe(false)
      expect(isActiveColumn.isUnique).toBe(false)
      expect(isActiveColumn.isAutoIncrement).toBe(false)
      expect(isActiveColumn.foreignKeyConstraint).toBe(null)
    })

    it('TIMESTAMP型・ON UPDATE CURRENT_TIMESTAMPカラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )!

      const updatedAtColumn = customersTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'updated_at'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(updatedAtColumn)).toBe('updated_at')
      expect(getColumnByLogicalName(updatedAtColumn)).toBe('更新日時')
      expect(getColumnComment(updatedAtColumn)).toBe('')
      expect(updatedAtColumn.dataType).toBe('timestamp without time zone') // TODO with timezone 変更する
      expect(updatedAtColumn.isNullable).toBe(true)
      expect(updatedAtColumn.defaultValue).toBe('CURRENT_TIMESTAMP')
      expect(updatedAtColumn.maxLength).toBe(null)
      expect(updatedAtColumn.precision).toBe(null)
      expect(updatedAtColumn.scale).toBe(null)
      expect(updatedAtColumn.isPrimaryKey).toBe(false)
      expect(updatedAtColumn.isUnique).toBe(false)
      expect(updatedAtColumn.isAutoIncrement).toBe(false)
      expect(updatedAtColumn.foreignKeyConstraint).toBe(null)
    })

    it('NULL許可・外部キーカラムの全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'products'
      )!

      const categoryIdColumn = productsTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'category_id'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(categoryIdColumn)).toBe('category_id')
      expect(getColumnByLogicalName(categoryIdColumn)).toBe('カテゴリID')
      expect(getColumnComment(categoryIdColumn)).toBe('')
      expect(categoryIdColumn.dataType).toBe('integer')
      expect(categoryIdColumn.isNullable).toBe(true)
      expect(categoryIdColumn.defaultValue).toBe(null)
      expect(categoryIdColumn.maxLength).toBe(null)
      expect(categoryIdColumn.precision).toBe(32)
      expect(categoryIdColumn.scale).toBe(0)
      expect(categoryIdColumn.isPrimaryKey).toBe(false)
      expect(categoryIdColumn.isUnique).toBe(false)
      expect(categoryIdColumn.isAutoIncrement).toBe(false)
      // 外部キー制約はテーブルレベルで管理されるためnull
      expect(categoryIdColumn.foreignKeyConstraint).toBe(null)
    })

    it('ENUM型カラム（orders.status）の全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const ordersTable = database.tables.find((table) => getTablePhysicalName(table) === 'orders')!

      const statusColumn = ordersTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'status'
      )!

      expect(getColumnPhysicalName(statusColumn)).toBe('status')
      expect(getColumnByLogicalName(statusColumn)).toBe('注文状態')
      expect(getColumnComment(statusColumn)).toBe('')
      expect(statusColumn.dataType).toBe('enum')
      expect(statusColumn.isNullable).toBe(true)
      expect(statusColumn.defaultValue).toBe(null)
      expect(statusColumn.isPrimaryKey).toBe(false)
      expect(statusColumn.isUnique).toBe(false)
      expect(statusColumn.isAutoIncrement).toBe(false)
      expect(statusColumn.foreignKeyConstraint).toBe(null)
    })

    it('ENUM型カラム（orders.status）の許容値が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const ordersTable = database.tables.find((table) => getTablePhysicalName(table) === 'orders')!

      const statusColumn = ordersTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'status'
      )!

      expect(isEnumColumn(statusColumn)).toBe(true)
      expect(getEnumValueCount(statusColumn)).toBe(5)

      const enumValues = getEnumValues(statusColumn)
      expect(enumValues).toEqual(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
    })

    it('非ENUM型カラム（customers.name）はENUM値が空であることを確認', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )!

      const nameColumn = customersTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'name'
      )!

      expect(isEnumColumn(nameColumn)).toBe(false)
      expect(getEnumValueCount(nameColumn)).toBe(0)
      expect(getEnumValues(nameColumn)).toEqual([])
    })

    it('DATE型カラム（employees.hire_date）の全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const employeesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'employees'
      )!

      const hireDateColumn = employeesTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'hire_date'
      )!

      expect(getColumnPhysicalName(hireDateColumn)).toBe('hire_date')
      expect(getColumnByLogicalName(hireDateColumn)).toBe('入社日')
      expect(getColumnComment(hireDateColumn)).toBe('')
      expect(hireDateColumn.dataType).toBe('date')
      expect(hireDateColumn.isNullable).toBe(true)
      expect(hireDateColumn.defaultValue).toBe(null)
      expect(hireDateColumn.maxLength).toBe(null)
      expect(hireDateColumn.precision).toBe(null)
      expect(hireDateColumn.scale).toBe(null)
      expect(hireDateColumn.isPrimaryKey).toBe(false)
      expect(hireDateColumn.isUnique).toBe(false)
      expect(hireDateColumn.isAutoIncrement).toBe(false)
      expect(hireDateColumn.foreignKeyConstraint).toBe(null)
    })

    describe('複合主キー', () => {
      it('複合主キーカラム（project_members.project_id）の全プロパティが正しく取得できる', async () => {
        const database = await repository.retrieveTableDefinitions()
        const projectMembersTable = database.tables.find(
          (table) => getTablePhysicalName(table) === 'project_members'
        )!

        const projectIdColumn = projectMembersTable.columns.find(
          (col) => getColumnPhysicalName(col) === 'project_id'
        )!

        expect(getColumnPhysicalName(projectIdColumn)).toBe('project_id')
        expect(getColumnByLogicalName(projectIdColumn)).toBe('プロジェクトID')
        expect(getColumnComment(projectIdColumn)).toBe('')
        expect(projectIdColumn.dataType).toBe('integer')
        expect(projectIdColumn.isNullable).toBe(false)
        expect(projectIdColumn.defaultValue).toBe(null)
        expect(projectIdColumn.maxLength).toBe(null)
        expect(projectIdColumn.precision).toBe(32)
        expect(projectIdColumn.scale).toBe(0)
        expect(projectIdColumn.isPrimaryKey).toBe(true) // 複合主キーの一部
        expect(projectIdColumn.isUnique).toBe(false)
        expect(projectIdColumn.isAutoIncrement).toBe(false)
        expect(projectIdColumn.foreignKeyConstraint).toBe(null)
      })

      it('複合主キーカラム（project_members.employee_id）の全プロパティが正しく取得できる', async () => {
        const database = await repository.retrieveTableDefinitions()
        const projectMembersTable = database.tables.find(
          (table) => getTablePhysicalName(table) === 'project_members'
        )!

        const employeeIdColumn = projectMembersTable.columns.find(
          (col) => getColumnPhysicalName(col) === 'employee_id'
        )!

        expect(getColumnPhysicalName(employeeIdColumn)).toBe('employee_id')
        expect(getColumnByLogicalName(employeeIdColumn)).toBe('従業員ID')
        expect(getColumnComment(employeeIdColumn)).toBe('')
        expect(employeeIdColumn.dataType).toBe('integer')
        expect(employeeIdColumn.isNullable).toBe(false)
        expect(employeeIdColumn.defaultValue).toBe(null)
        expect(employeeIdColumn.maxLength).toBe(null)
        expect(employeeIdColumn.precision).toBe(32)
        expect(employeeIdColumn.scale).toBe(0)
        expect(employeeIdColumn.isPrimaryKey).toBe(true) // 複合主キーの一部
        expect(employeeIdColumn.isUnique).toBe(false)
        expect(employeeIdColumn.isAutoIncrement).toBe(false)
        expect(employeeIdColumn.foreignKeyConstraint).toBe(null)
      })

      it('複合主キー（project_members）の両方のカラムが主キーとして認識される', async () => {
        const database = await repository.retrieveTableDefinitions()
        const projectMembersTable = database.tables.find(
          (table) => getTablePhysicalName(table) === 'project_members'
        )!

        const primaryKeyColumns = projectMembersTable.columns.filter((col) => col.isPrimaryKey)
        const primaryKeyNames = primaryKeyColumns.map((col) => getColumnPhysicalName(col)).sort()

        expect(primaryKeyColumns.length).toBe(2)
        expect(primaryKeyNames).toEqual(['employee_id', 'project_id'])
      })
    })

    it('JSON型カラム（audit_logs.old_values）の全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const auditLogsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'audit_logs'
      )!

      const oldValuesColumn = auditLogsTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'old_values'
      )!

      expect(getColumnPhysicalName(oldValuesColumn)).toBe('old_values')
      expect(getColumnByLogicalName(oldValuesColumn)).toBe('変更前の値')
      expect(getColumnComment(oldValuesColumn)).toBe('')
      expect(oldValuesColumn.dataType).toBe('jsonb')
      expect(oldValuesColumn.isNullable).toBe(true)
      expect(oldValuesColumn.defaultValue).toBe(null)
      expect(oldValuesColumn.maxLength).toBe(null)
      expect(oldValuesColumn.precision).toBe(null)
      expect(oldValuesColumn.scale).toBe(null)
      expect(oldValuesColumn.isPrimaryKey).toBe(false)
      expect(oldValuesColumn.isUnique).toBe(false)
      expect(oldValuesColumn.isAutoIncrement).toBe(false)
      expect(oldValuesColumn.foreignKeyConstraint).toBe(null)
    })

    it('NULL不許可カラム（customers.name）の全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const customersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'customers'
      )!

      const nameColumn = customersTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'name'
      )!

      // 基本プロパティ
      expect(getColumnPhysicalName(nameColumn)).toBe('name')
      expect(getColumnByLogicalName(nameColumn)).toBe('顧客名')
      expect(getColumnComment(nameColumn)).toBe('')
      expect(nameColumn.dataType).toBe('character varying')
      expect(nameColumn.isNullable).toBe(false)
      expect(nameColumn.defaultValue).toBe(null)
      expect(nameColumn.maxLength).toBe(100)
      expect(nameColumn.precision).toBe(null)
      expect(nameColumn.scale).toBe(null)
      expect(nameColumn.isPrimaryKey).toBe(false)
      expect(nameColumn.isUnique).toBe(false)
      expect(nameColumn.isAutoIncrement).toBe(false)
      expect(nameColumn.foreignKeyConstraint).toBe(null)
    })

    it('自己参照外部キーカラム（employees.manager_id）の全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const employeesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'employees'
      )!

      const managerIdColumn = employeesTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'manager_id'
      )!

      expect(getColumnPhysicalName(managerIdColumn)).toBe('manager_id')
      expect(getColumnByLogicalName(managerIdColumn)).toBe('上司ID')
      expect(getColumnComment(managerIdColumn)).toBe('')
      expect(managerIdColumn.dataType).toBe('integer')
      expect(managerIdColumn.isNullable).toBe(true)
      expect(managerIdColumn.defaultValue).toBe(null)
      expect(managerIdColumn.maxLength).toBe(null)
      expect(managerIdColumn.precision).toBe(32)
      expect(managerIdColumn.scale).toBe(0)
      expect(managerIdColumn.isPrimaryKey).toBe(false)
      expect(managerIdColumn.isUnique).toBe(false)
      expect(managerIdColumn.isAutoIncrement).toBe(false)
      expect(managerIdColumn.foreignKeyConstraint).toBe(null)
    })

    it('DEFAULT値ありの外部キーカラム（departments.parent_department_id）の全プロパティが正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const departmentsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'departments'
      )!

      const parentIdColumn = departmentsTable.columns.find(
        (col) => getColumnPhysicalName(col) === 'parent_department_id'
      )!

      expect(getColumnPhysicalName(parentIdColumn)).toBe('parent_department_id')
      expect(getColumnByLogicalName(parentIdColumn)).toBe('親部門ID')
      expect(getColumnComment(parentIdColumn)).toBe('')
      expect(parentIdColumn.dataType).toBe('integer')
      expect(parentIdColumn.isNullable).toBe(true)
      expect(parentIdColumn.defaultValue).toBe('1')
      expect(parentIdColumn.maxLength).toBe(null)
      expect(parentIdColumn.precision).toBe(32)
      expect(parentIdColumn.scale).toBe(0)
      expect(parentIdColumn.isPrimaryKey).toBe(false)
      expect(parentIdColumn.isUnique).toBe(false)
      expect(parentIdColumn.isAutoIncrement).toBe(false)
      expect(parentIdColumn.foreignKeyConstraint).toBe(null)
    })
  })

  describe('参照整合性制約取得', () => {
    it('SET NULL制約（products.category_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'products'
      )!

      const categoryConstraint = productsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'category_id'
      )

      expect(categoryConstraint).toBeDefined()
      expect(categoryConstraint!.constraintName).toBeDefined()
      expect(categoryConstraint!.sourceTable).toBe('products')
      expect(categoryConstraint!.sourceColumn).toBe('category_id')
      expect(categoryConstraint!.referencedTable).toBe('categories')
      expect(categoryConstraint!.referencedColumn).toBe('id')
      expect(categoryConstraint!.onDelete).toBe(ConstraintAction.SET_NULL)
      expect(categoryConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)
    })

    it('RESTRICT制約（orders.customer_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const ordersTable = database.tables.find((table) => getTablePhysicalName(table) === 'orders')!

      const customerConstraint = ordersTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'customer_id'
      )

      expect(customerConstraint).toBeDefined()
      expect(customerConstraint!.sourceTable).toBe('orders')
      expect(customerConstraint!.sourceColumn).toBe('customer_id')
      expect(customerConstraint!.referencedTable).toBe('customers')
      expect(customerConstraint!.referencedColumn).toBe('id')
      expect(customerConstraint!.onDelete).toBe(ConstraintAction.RESTRICT)
      expect(customerConstraint!.onUpdate).toBe(ConstraintAction.RESTRICT)
    })

    it('NO ACTION制約（order_items.order_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const orderItemsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'order_items'
      )!

      const orderConstraint = orderItemsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'order_id'
      )

      expect(orderConstraint).toBeDefined()
      expect(orderConstraint!.sourceTable).toBe('order_items')
      expect(orderConstraint!.sourceColumn).toBe('order_id')
      expect(orderConstraint!.referencedTable).toBe('orders')
      expect(orderConstraint!.referencedColumn).toBe('id')
      expect(orderConstraint!.onDelete).toBe(ConstraintAction.NO_ACTION)
      expect(orderConstraint!.onUpdate).toBe(ConstraintAction.NO_ACTION)
    })

    it('CASCADE制約（product_tags.product_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productTagsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'product_tags'
      )!

      const productConstraint = productTagsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'product_id'
      )

      expect(productConstraint).toBeDefined()
      expect(productConstraint!.sourceTable).toBe('product_tags')
      expect(productConstraint!.sourceColumn).toBe('product_id')
      expect(productConstraint!.referencedTable).toBe('products')
      expect(productConstraint!.referencedColumn).toBe('id')
      expect(productConstraint!.onDelete).toBe(ConstraintAction.CASCADE)
      expect(productConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)
    })

    it('SET DEFAULT制約（product_tags.tag_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const productTagsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'product_tags'
      )!

      const tagConstraint = productTagsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'tag_id'
      )

      expect(tagConstraint).toBeDefined()
      expect(tagConstraint!.sourceTable).toBe('product_tags')
      expect(tagConstraint!.sourceColumn).toBe('tag_id')
      expect(tagConstraint!.referencedTable).toBe('tags')
      expect(tagConstraint!.referencedColumn).toBe('id')
      expect(tagConstraint!.onDelete).toBe(ConstraintAction.SET_DEFAULT)
      expect(tagConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)
    })

    it('自己参照外部キー制約（employees.manager_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const employeesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'employees'
      )!

      const managerConstraint = employeesTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'manager_id'
      )

      expect(managerConstraint).toBeDefined()
      expect(managerConstraint!.sourceTable).toBe('employees')
      expect(managerConstraint!.sourceColumn).toBe('manager_id')
      expect(managerConstraint!.referencedTable).toBe('employees')
      expect(managerConstraint!.referencedColumn).toBe('id')
      expect(managerConstraint!.onDelete).toBe(ConstraintAction.SET_NULL)
      expect(managerConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)
    })

    it('SET DEFAULT ON UPDATE制約（departments.parent_department_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const departmentsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'departments'
      )!

      const parentConstraint = departmentsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'parent_department_id'
      )

      expect(parentConstraint).toBeDefined()
      expect(parentConstraint!.sourceTable).toBe('departments')
      expect(parentConstraint!.sourceColumn).toBe('parent_department_id')
      expect(parentConstraint!.referencedTable).toBe('departments')
      expect(parentConstraint!.referencedColumn).toBe('id')
      expect(parentConstraint!.onDelete).toBe(ConstraintAction.SET_DEFAULT)
      expect(parentConstraint!.onUpdate).toBe(ConstraintAction.SET_DEFAULT)
    })

    it('複合外部キー制約（inventory）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const inventoryTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'inventory'
      )!

      const storeConstraints = inventoryTable.referentialConstraints.filter(
        (constraint) => constraint.referencedTable === 'store_departments'
      )

      expect(storeConstraints.length).toBe(2) // store_code, department_code

      const storeCodeConstraint = storeConstraints.find(
        (constraint) => constraint.sourceColumn === 'store_code'
      )
      const departmentCodeConstraint = storeConstraints.find(
        (constraint) => constraint.sourceColumn === 'department_code'
      )

      expect(storeCodeConstraint).toBeDefined()
      expect(storeCodeConstraint!.referencedColumn).toBe('store_code')
      expect(storeCodeConstraint!.onDelete).toBe(ConstraintAction.RESTRICT)
      expect(storeCodeConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)

      expect(departmentCodeConstraint).toBeDefined()
      expect(departmentCodeConstraint!.referencedColumn).toBe('department_code')
    })

    it('複数の複合外部キー制約（product_movements）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const movementsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'product_movements'
      )!

      // 3つの外部キー制約を期待: product_id, from_store_departments, to_store_departments
      expect(movementsTable.referentialConstraints.length).toBeGreaterThanOrEqual(5)

      // product_id制約
      const productConstraint = movementsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'product_id'
      )
      expect(productConstraint).toBeDefined()
      expect(productConstraint!.referencedTable).toBe('products')
      expect(productConstraint!.onDelete).toBe(ConstraintAction.CASCADE)

      // from_store_departments制約（SET NULL）
      const fromStoreConstraints = movementsTable.referentialConstraints.filter(
        (constraint) =>
          constraint.sourceColumn === 'from_store_code' ||
          constraint.sourceColumn === 'from_department_code'
      )
      expect(fromStoreConstraints.length).toBe(2)
      fromStoreConstraints.forEach((constraint) => {
        expect(constraint.referencedTable).toBe('store_departments')
        expect(constraint.onDelete).toBe(ConstraintAction.SET_NULL)
        expect(constraint.onUpdate).toBe(ConstraintAction.CASCADE)
      })

      // to_store_departments制約（RESTRICT）
      const toStoreConstraints = movementsTable.referentialConstraints.filter(
        (constraint) =>
          constraint.sourceColumn === 'to_store_code' ||
          constraint.sourceColumn === 'to_department_code'
      )
      expect(toStoreConstraints.length).toBe(2)
      toStoreConstraints.forEach((constraint) => {
        expect(constraint.referencedTable).toBe('store_departments')
        expect(constraint.onDelete).toBe(ConstraintAction.RESTRICT)
        expect(constraint.onUpdate).toBe(ConstraintAction.CASCADE)
      })
    })

    it('RESTRICT ON UPDATE制約（employees.department_id）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const employeesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'employees'
      )!

      const departmentConstraint = employeesTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'department_id'
      )

      expect(departmentConstraint).toBeDefined()
      expect(departmentConstraint!.sourceTable).toBe('employees')
      expect(departmentConstraint!.sourceColumn).toBe('department_id')
      expect(departmentConstraint!.referencedTable).toBe('departments')
      expect(departmentConstraint!.referencedColumn).toBe('id')
      expect(departmentConstraint!.onDelete).toBe(ConstraintAction.SET_NULL)
      expect(departmentConstraint!.onUpdate).toBe(ConstraintAction.RESTRICT)
    })

    it('プロジェクト関連の複雑な制約チェーン（projects）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const projectsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'projects'
      )!

      expect(projectsTable.referentialConstraints.length).toBe(2)

      const departmentConstraint = projectsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'department_id'
      )
      const managerConstraint = projectsTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'manager_id'
      )

      expect(departmentConstraint).toBeDefined()
      expect(departmentConstraint!.referencedTable).toBe('departments')
      expect(departmentConstraint!.onDelete).toBe(ConstraintAction.RESTRICT)
      expect(departmentConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)

      expect(managerConstraint).toBeDefined()
      expect(managerConstraint!.referencedTable).toBe('employees')
      expect(managerConstraint!.onDelete).toBe(ConstraintAction.RESTRICT)
      expect(managerConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)
    })

    it('多対多関係のCASCADE制約（project_members）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const projectMembersTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'project_members'
      )!

      expect(projectMembersTable.referentialConstraints.length).toBe(2)

      const projectConstraint = projectMembersTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'project_id'
      )
      const employeeConstraint = projectMembersTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'employee_id'
      )

      expect(projectConstraint).toBeDefined()
      expect(projectConstraint!.referencedTable).toBe('projects')
      expect(projectConstraint!.onDelete).toBe(ConstraintAction.CASCADE)
      expect(projectConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)

      expect(employeeConstraint).toBeDefined()
      expect(employeeConstraint!.referencedTable).toBe('employees')
      expect(employeeConstraint!.onDelete).toBe(ConstraintAction.CASCADE)
      expect(employeeConstraint!.onUpdate).toBe(ConstraintAction.CASCADE)
    })

    it('SET DEFAULT ON UPDATE + NO ACTION制約の組み合わせ（expenses）が正しく取得できる', async () => {
      const database = await repository.retrieveTableDefinitions()
      const expensesTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'expenses'
      )!

      expect(expensesTable.referentialConstraints.length).toBe(2)

      const projectConstraint = expensesTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'project_id'
      )
      const employeeConstraint = expensesTable.referentialConstraints.find(
        (constraint) => constraint.sourceColumn === 'employee_id'
      )

      expect(projectConstraint).toBeDefined()
      expect(projectConstraint!.referencedTable).toBe('projects')
      expect(projectConstraint!.onDelete).toBe(ConstraintAction.SET_DEFAULT)
      expect(projectConstraint!.onUpdate).toBe(ConstraintAction.SET_DEFAULT)

      expect(employeeConstraint).toBeDefined()
      expect(employeeConstraint!.referencedTable).toBe('employees')
      expect(employeeConstraint!.onDelete).toBe(ConstraintAction.NO_ACTION)
      expect(employeeConstraint!.onUpdate).toBe(ConstraintAction.NO_ACTION)
    })
    it('参照整合性制約なしテーブル（audit_logs）の制約が空であることを確認', async () => {
      const database = await repository.retrieveTableDefinitions()
      const auditLogsTable = database.tables.find(
        (table) => getTablePhysicalName(table) === 'audit_logs'
      )!
      expect(auditLogsTable.referentialConstraints.length).toBe(0)
    })
  })

  describe('エラーハンドリング', () => {
    it('存在しないデータベースへの接続はエラーになる', async () => {
      const invalidRepository = new PostgreSQLDatabaseRepository({
        ...testConfig,
        database: 'nonexistent_database',
      })

      await expect(invalidRepository.retrieveTableDefinitions()).rejects.toThrow()
      await invalidRepository.close()
    })
  })
})
