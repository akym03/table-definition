import { describe, it, expect } from 'vitest'
import {
  createName,
  hasLogicalName,
  hasComment,
  getDisplayName,
  nameToString,
} from '@/domain/entities/Name'

describe('Name', () => {
  describe('createName', () => {
    it('物理名のみでNameを作成すると論理名は物理名と同じ', () => {
      const name = createName('test_table')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('test_table')
      expect(name.comment).toBe('')
    })

    it('コメントから論理名を持つNameを作成すること', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('テストテーブル')
      expect(name.comment).toBe('')
    })

    it('論理名とコメントを持つNameを作成すること', () => {
      const name = createName('test_table', 'テストテーブル これは テスト です')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('テストテーブル')
      expect(name.comment).toBe('これは テスト です')
    })

    it('空のコメントなら論理名が物理名と同じ', () => {
      const name = createName('test_table', '')
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('test_table')
      expect(name.comment).toBe('')
    })

    it('nullのコメントなら論理名が物理名と同', () => {
      const name = createName('test_table', null)
      expect(name.physicalName).toBe('test_table')
      expect(name.logicalName).toBe('test_table')
      expect(name.comment).toBe('')
    })
  })

  describe('hasLogicalName', () => {
    it('論理名が物理名と同じ場合にfalseを返すこと', () => {
      const name = createName('test_table')
      expect(hasLogicalName(name)).toBe(false)
    })

    it('論理名が物理名と異なる場合にtrueを返すこと', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(hasLogicalName(name)).toBe(true)
    })
  })

  describe('hasComment', () => {
    it('コメントが空の場合にfalseを返すこと', () => {
      const name = createName('test_table')
      expect(hasComment(name)).toBe(false)
    })

    it('コメントが存在する場合にtrueを返すこと', () => {
      const name = createName('test_table', 'テストテーブル これはコメントです')
      expect(hasComment(name)).toBe(true)
    })
  })

  describe('getDisplayName', () => {
    it('論理名がない場合に物理名を返すこと', () => {
      const name = createName('test_table')
      expect(getDisplayName(name)).toBe('test_table')
    })

    it('論理名が利用可能な場合に論理名を返すこと', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(getDisplayName(name)).toBe('テストテーブル')
    })
  })

  describe('nameToString', () => {
    it('物理名のみを返すこと', () => {
      const name = createName('test_table')
      expect(nameToString(name)).toBe('test_table')
    })

    it('物理名と共に論理名を返すこと', () => {
      const name = createName('test_table', 'テストテーブル')
      expect(nameToString(name)).toBe('テストテーブル (test_table)')
    })

    it('コメントと共に物理名を返すこと', () => {
      const name = createName('test_table', ' これはコメントです')
      expect(nameToString(name)).toBe('これはコメントです (test_table)')
    })

    it('論理名とコメントを含む完全な形式を返すこと', () => {
      const name = createName('test_table', 'テストテーブル これはコメントです')
      expect(nameToString(name)).toBe('テストテーブル (test_table) - これはコメントです')
    })
  })
})
