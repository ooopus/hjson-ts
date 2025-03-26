import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parse, stringify } from '../src/hjson';

describe('Hjson解析测试', () => {
  it('应该正确解析hjson文件', () => {
    // 读取测试文件
    const hjsonContent = fs.readFileSync(
      path.resolve(__dirname, './test.hjson'),
      'utf-8'
    );
    
    // 解析hjson内容
    const parsed = parse(hjsonContent);
    
    // 验证解析结果
    expect(parsed).toBeTypeOf('object');
    expect(parsed.hello).toBe('Hello Human!');
    expect(parsed.text).toBe('This is a valid string value.');
    expect(parsed.quote).toBe('You need quotes\tfor escapes');
    expect(parsed.otherwise).toBe('<div class="cool">life without escapes is bliss!</div>');
    expect(parsed['abc-123']).toBe('no quotes for keys');
    expect(parsed.commas).toBe('can be omitted at the end of the line');
    expect(parsed.but).toEqual([1, 2, 3]);
    expect(parsed.trailing).toEqual([1, 2, 3]);
    
    // 测试多行字符串
    expect(parsed.multiline).toBe('first line\n  indented line\nthird line');
    
    // 测试数字和关键字
    expect(parsed.number).toBe(5);
    expect(parsed.negative).toBe(-4.2);
    expect(parsed.yes).toBe(true);
    expect(parsed.no).toBe(false);
    expect(parsed.null).toBe(null);
    expect(parsed.array).toEqual([1, 2]);
    expect(parsed.array2).toEqual([1, 2]);
  });

  it('应该处理各种注释', () => {
    const hjsonWithComments = `{
      # hash comment
      key1: value1
      // js style comment
      key2: value2
      /* multiline comment
         spanning multiple lines */
      key3: value3
    }`;
    
    const parsed = parse(hjsonWithComments);
    
    expect(parsed.key1).toBe('value1');
    expect(parsed.key2).toBe('value2');
    expect(parsed.key3).toBe('value3');
  });

  it('应该处理省略逗号的情况', () => {
    const hjsonWithoutCommas = `{
      key1: value1
      key2: value2
      key3: value3
    }`;
    
    const parsed = parse(hjsonWithoutCommas);
    
    expect(parsed.key1).toBe('value1');
    expect(parsed.key2).toBe('value2');
    expect(parsed.key3).toBe('value3');
  });

  it('显示解析后的完整输出', () => {
    // 读取测试文件
    const hjsonContent = fs.readFileSync(
      path.resolve(__dirname, './test.hjson'),
      'utf-8'
    );
    
    // 解析hjson内容
    const parsed = parse(hjsonContent);
    
    // 输出解析后的完整JSON结构
    console.log('解析后的完整JSON结构:');
    console.log(JSON.stringify(parsed, null, 2));
    
    // 也可以输出使用Hjson格式化后的结果
    console.log('\nHjson格式化后的结果:');
    console.log(stringify(parsed, { space: 2 }));
    
    // 简单断言确保测试通过
    expect(parsed).toBeDefined();
  });
});