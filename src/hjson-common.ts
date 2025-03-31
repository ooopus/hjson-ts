/**
 * Common utility functions for Hjson
 */

import os from 'os';
import { Comments } from './types/comments';

/** End of line character sequence */
let _EOL = os.EOL || '\n';

export function getEOL(): string {
  return _EOL;
}

export function setEOL(eol: string): void {
  _EOL = eol;
}

/**
 * Tries to parse a string as a number
 * @param text The text to parse
 * @param stopAtNext If true, stops parsing at certain characters
 * @returns The parsed number or undefined if not a valid number
 */
export function tryParseNumber(text: string, stopAtNext?: boolean): number | undefined {
  // Try to parse a number
  let number: number;
  let string = '';
  let leadingZeros = 0;
  let testLeading = true;
  let at = 0;
  let ch = ''; // 初始化 ch 为空字符串

  function next(): string {
    ch = text.charAt(at);
    at++;
    return ch;
  }

  next();
  if (ch === '-') {
    string = '-';
    next();
  }

  while (ch >= '0' && ch <= '9') {
    if (testLeading) {
      if (ch === '0') leadingZeros++;
      else testLeading = false;
    }
    string += ch;
    next();
  }

  if (testLeading) leadingZeros--; // single 0 is allowed

  if (ch === '.') {
    string += '.';
    while (next() && ch >= '0' && ch <= '9') {
      string += ch;
    }
  }

  if (ch === 'e' || ch === 'E') {
    string += ch;
    next();
    // 修复类型比较错误，使用类型断言
    if (ch as string === '-' || ch as string === '+') {
      string += ch;
      next();
    }
    while (ch >= '0' && ch <= '9') {
      string += ch;
      next();
    }
  }

  // Skip white/to (newline)
  while (ch && ch <= ' ') next();

  if (stopAtNext) {
    // End scan if we find a punctuator character like ,}] or a comment
    if (ch === ',' || ch === '}' || ch === ']' ||
      ch === '#' || ch === '/' && (text[at] === '/' || text[at] === '*')) ch = '\0';
  }

  number = +string;
  if (ch || leadingZeros || !isFinite(number)) return undefined;
  else return number;
}

/**
 * Creates a comment object for a value
 * @param value The value to attach comments to
 * @param comment The comment object
 * @returns The comment object
 */
export function createComment(obj: any, comments: Comments): Comments {
  if (!obj || typeof obj !== 'object') return comments;
  
  Object.defineProperty(obj, '__COMMENTS__', {
    enumerable: false,
    writable: true,
    value: comments
  });
  
  return comments;
}

/**
 * Removes comments from a value
 * @param value The value to remove comments from
 */
export function removeComment(value: any): void {
  Object.defineProperty(value, "__COMMENTS__", { value: undefined });
}

/**
 * Gets comments from a value
 * @param value The value to get comments from
 * @returns The comment object
 */
export function getComment(obj: any): any {
  if (!obj || typeof obj !== 'object') return undefined;
  return obj.__COMMENTS__;
}

/**
 * Forces text to be a comment
 * @param text The text to force as a comment
 * @returns The comment text
 */
export function forceComment(text: string): string {
  if (!text) return "";
  const lines = text.split('\n');
  let str: string;
  let i: number, j: number, len: number;

  for (j = 0; j < lines.length; j++) {
    str = lines[j];
    len = str.length;
    for (i = 0; i < len; i++) {
      const c = str[i];
      if (c === '#') break;
      else if (c === '/' && (str[i+1] === '/' || str[i+1] === '*')) {
        if (str[i+1] === '*') j = lines.length; // assume /**/ covers whole block, bail out
        break;
      }
      else if (c > ' ') {
        lines[j] = '# ' + str;
        break;
      }
    }
  }
  return lines.join('\n');
}

export default {
  getEOL,
  setEOL,
  tryParseNumber,
  createComment,
  removeComment,
  getComment,
  forceComment
}
