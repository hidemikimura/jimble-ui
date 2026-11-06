// jimble-code-editor の変数の書式(src/components/code-editor/variables.ts)
import { describe, expect, it } from 'vitest'
import {
  filterVariables,
  findVariables,
  variableQuery,
  variableToken,
} from '../../src/components/code-editor/variables.ts'

const vars = [
  { name: 'customer_name', label: '顧客名' },
  { name: 'order.id', label: '注文番号', description: '#10001 の形式' },
  { name: 'shop_url' },
]

describe('変数の文字列', () => {
  it('区切り記号で名前を包む', () => {
    expect(variableToken('customer_name', '{{', '}}')).toBe('{{customer_name}}')
    expect(variableToken('x', '${', '}')).toBe('${x}')
  })
})

describe('文書の中の変数を探す', () => {
  it('位置と名前を返す。区切りの内側の空白は許す', () => {
    const text = 'こんにちは {{customer_name}} 様。注文 {{ order.id }} を受け付けました'
    expect(findVariables(text, '{{', '}}')).toEqual([
      { from: 6, to: 23, name: 'customer_name' },
      { from: 29, to: 43, name: 'order.id' },
    ])
  })

  it('正規表現の記号を含む区切りでも探せる', () => {
    expect(findVariables('値は ${price} 円', '${', '}')).toEqual([
      { from: 3, to: 11, name: 'price' },
    ])
  })

  it('閉じていないもの・名前に使えない文字を含むものは、変数ではない', () => {
    expect(findVariables('{{customer_name', '{{', '}}')).toEqual([])
    expect(findVariables('{{顧客 名}}', '{{', '}}')).toEqual([])
    expect(findVariables('{{}}', '{{', '}}')).toEqual([])
  })
})

describe('入力中の変数(補完の対象)', () => {
  it('カーソルの前に、閉じていない開きの区切りがあれば、その位置と入力中の文字を返す', () => {
    expect(variableQuery('件名: {{cust', '{{', '}}')).toEqual({ from: 4, query: 'cust' })
    expect(variableQuery('件名: {{', '{{', '}}')).toEqual({ from: 4, query: '' })
    // 日本語(ラベル)で探せる
    expect(variableQuery('{{顧客', '{{', '}}')).toEqual({ from: 0, query: '顧客' })
  })

  it('閉じている・改行や空白をまたぐ・開きの区切りがないときは null', () => {
    expect(variableQuery('{{customer_name}} ', '{{', '}}')).toBeNull()
    expect(variableQuery('{{cust\nomer', '{{', '}}')).toBeNull()
    expect(variableQuery('{{cust omer', '{{', '}}')).toBeNull()
    expect(variableQuery('件名', '{{', '}}')).toBeNull()
  })
})

describe('候補を絞り込む', () => {
  it('名前・ラベルのどちらでも一致する(全角半角・かなの違いは無視)', () => {
    expect(filterVariables(vars, 'cust').map((v) => v.name)).toEqual(['customer_name'])
    expect(filterVariables(vars, '顧客').map((v) => v.name)).toEqual(['customer_name'])
    expect(filterVariables(vars, 'ＯＲＤＥＲ').map((v) => v.name)).toEqual(['order.id'])
  })

  it('空の入力なら、すべて', () => {
    expect(filterVariables(vars, '')).toHaveLength(3)
  })
})
