/**
 * Hjson stringifier
 * Converts JavaScript values to Hjson format
 */

import { StringifyOptions } from './types/stringify-options';
import { Token } from './types/token';
import * as common from './hjson-common';
import { loadDsf } from './hjson-dsf';

/**
 * Stringifies a JavaScript value to Hjson format
 * @param value - The value to stringify
 * @param opt - Optional configuration for the stringification process
 * @returns The Hjson string representation
 */
export default function stringify(value: any, opt?: StringifyOptions): string {
  const plainToken: Token = {
    obj: [ '{', '}' ],
    arr: [ '[', ']' ],
    key: [ '', '' ],
    qkey: [ '"', '"' ],
    col: [ ':', '' ],
    com: [ ',', '' ],
    str: [ '', '' ],
    qstr: [ '"', '"' ],
    mstr: [ "'''", "'''" ],
    num: [ '', '' ],
    lit: [ '', '' ],
    dsf: [ '', '' ],
    esc: [ '\\', '' ],
    uni: [ '\\u', '' ],
    rem: [ '', '' ],
  };

  // Options
  const eol = opt?.eol ?? common.getEOL();
  // Ensure indent is always a string
  const indent = typeof opt?.space === 'number' 
    ? ' '.repeat(opt.space) 
    : (opt?.space ?? '  ');
  const keepComments = opt?.keepWsc ?? false;
  const bracesSameLine = opt?.bracesSameLine ?? false;
  const quoteKeys = opt?.quotes === 'all' || opt?.quotes === 'keys';
  const quoteStrings = opt?.quotes === 'all' || opt?.quotes === 'strings' || opt?.separator === true;
  const condense = opt?.condense ?? 0;
  let multiline = opt?.multiline === 'std' || opt?.multiline === undefined ? 1 : 
                 opt?.multiline === 'no-tabs' ? 2 : 
                 opt?.multiline === 'off' ? 0 : 
                 typeof opt?.multiline === 'number' ? opt.multiline : 1;
  // Only add commas when separator is explicitly set to true
  const separator = opt?.separator === true ? ',' : '';
  const sortProps = opt?.sortProps ?? false;
  const token = plainToken;
  const runDsf = loadDsf(opt?.dsf, 'stringify');

  if (quoteStrings || multiline === 0) multiline = 0;

  /**
   * Checks if a string is a Hjson keyword (true, false, null) or a number
   * @param value - The string to check
   * @returns True if the string is a keyword or number
   */
  function isKeyword(value: string): boolean {
    return value === 'true' || value === 'false' || value === 'null' ||
      common.tryParseNumber(value) !== undefined;
  }

  /**
   * Checks if a string can be safely used as a quoteless string
   * @param value - The string to check
   * @returns True if the string can be used without quotes
   */
  function isSafeString(value: string): boolean {
    if (value.length === 0) return false;
    if (isKeyword(value)) return false;

    // Check if character is a valid part of a quoteless string
    function isChar(c: string): boolean {
      return c >= ' ' && c <= '~' && c !== '\'' && c !== '"' && c !== '{' && c !== '}' && c !== '[' && c !== ']' && c !== ':' && c !== ','; 
    }

    // Check if the string contains comments
    function isComment(c: string, i: number): boolean {
      return (c === '/' && (value[i+1] === '/' || value[i+1] === '*')) ||
        (c === '#');
    }

    // Check the rest of the string
    for (let i = 0; i < value.length; i++) {
      if (isComment(value[i], i)) return false;
      if (!isChar(value[i])) return false;
    }

    return true;
  }

  /**
   * Checks if an object has a single property
   * @param value - The object to check
   * @returns True if the object has exactly one property
   */
  function hasSingleProp(value: any): boolean {
    let count = 0;
    for (const key in value) if (Object.prototype.hasOwnProperty.call(value, key)) count++;
    return count === 1;
  }

  /**
   * Formats a string into a quoteless string if possible, otherwise returns JSON string
   * @param value - The string to format
   * @param separator - The separator string
   * @param level - The current indentation level
   * @param isRootObject - Whether this is the root object
   * @returns The formatted string
   */
  function quotelessString(value: string, separator: string, level: number, isRootObject?: boolean): string {
    if (separator) return wrap(token.qstr, JSON.stringify(value).slice(1, -1));
    if (isSafeString(value)) return wrap(token.str, value);
    if (multiline && !isRootObject && value.indexOf('\n') >= 0) return mlString(value, level);
    return wrap(token.qstr, JSON.stringify(value).slice(1, -1));
  }

  /**
   * Formats a multiline string
   * @param value - The string to format
   * @param level - The current indentation level
   * @returns The formatted multiline string
   */
  function mlString(value: string, level: number): string {
    // Remove CR and add the triple quotes
    let res = value.replace(/\r[\n]?/g, '\n');
    const indentStr = indent.repeat(level+1);
    
    // Process multiline string indentation
    const lines = res.split('\n');
    const indentedContent = lines.map((line, i) => 
      // Don't add indentation to empty first and last lines
      (i === 0 || i === lines.length-1) && line.trim() === '' ? line : indentStr + line
    ).join(eol);
    
    // Triple quotes at the end with proper indentation
    if (res[res.length-1] === '\n') 
      return token.mstr[0] + eol + indentedContent + indentStr + token.mstr[1];
    else 
      return token.mstr[0] + eol + indentedContent + eol + indentStr + token.mstr[1];
  }

  /**
   * Formats a key into a key string
   * @param key - The key to format
   * @returns The formatted key string
   */
  function quoteKey(key: string): string {
    // Special handling for 'null' keyword
    if (key === 'null' && !quoteKeys)
      return wrap(token.key, key);

    if (quoteKeys || !isSafeString(key))
      return wrap(token.qkey, JSON.stringify(key).slice(1, -1));
    
    else return wrap(token.key, key);
  }

  /**
   * Visits a value and outputs the Hjson string
   * @param value - The value to stringify
   * @param separator - The separator string
   * @param level - The current indentation level
   * @param rootObject - Whether this is the root object
   * @param hasComment - Whether this value has comments
   * @returns The stringified value
   */
  function visit(value: any, separator: string, level: number, rootObject?: boolean, hasComment?: boolean): string {
    // Process a value with domain specific formatting
    const dsfValue = runDsf(value);
    if (dsfValue !== undefined) return dsfValue;

    // Check for comments
    const ci = keepComments ? common.getComment(value) : undefined;

    // Handle different value types
    if (value === null) return wrap(token.lit, 'null');
    if (typeof value === 'boolean') return wrap(token.lit, value ? 'true' : 'false');
    if (typeof value === 'string') {
      if (quoteStrings) return wrap(token.qstr, JSON.stringify(value).slice(1, -1));
      else {
        // Check for multiline string
        if (multiline && !rootObject && value.indexOf('\n') >= 0) {
          // For multiline strings, return a special marker that will be replaced with proper formatting
          return "\n" + indent.repeat(level+1) + mlString(value, level);
        }
        return quotelessString(value, separator, level, rootObject);
      }
    }
    if (typeof value === 'number') {
      // Ensure the number can be represented in JSON
      if (isFinite(value)) return wrap(token.num, String(value));
      else return wrap(token.lit, 'null');
    }
    if (typeof value === 'object') {
      // Array
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';

        let wsc = ci;

        let result = '';

        // Format the array
        if (condense > 0 && !wsc && !hasComment) {
          // Try to condense the array onto one line
          let res2 = '[ ';
          for (let i = 0; i < value.length; i++) {
            if (i > 0) res2 += ', ';
            res2 += visit(value[i], 'compact', 0, false, false);
          }
          res2 += ' ]';
          if (res2.length <= condense) return res2;
        }

        // Format the array with each element on a new line
        let indent1 = token.arr[0];
        let indent2 = indent.repeat(level+1);
        let indent3 = indent.repeat(level);
        let separator2 = separator;
        result += indent1 + eol;

        for (let i = 0; i < value.length; i++) {
          let comment = wsc ? wsc.a[i] : undefined;
          if (comment && comment.b) result += indent2 + makeComment(comment.b, "", false).replace(/\n/g, eol + indent2) + eol;
          result += indent2 + visit(value[i], separator2, level+1, false, comment && (commentOnThisLine(comment.a) || comment.b));
          // Only add commas between array elements, not after the last one
          if (i < value.length-1) result += token.com[0];
          if (comment && comment.a) result += makeComment(comment.a, commentOnThisLine(comment.a) ? " " : "", commentOnThisLine(comment.a)).replace(/\n/g, eol + indent2);
          result += eol;
        }

        if (wsc && wsc.e) {
          result += indent2 + wsc.e[0].replace(/\n/g, eol + indent2) + eol;
          if (wsc.e[1]) result += indent2 + wsc.e[1].replace(/\n/g, eol + indent2) + eol;
        }

        result += indent3 + token.arr[1];
        return result;
      } else {
        // Object
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';

        let wsc = ci;
        let showBraces = rootObject;
        let result = '';

        // Format the object
        if (condense > 0 && !wsc && !hasComment && hasSingleProp(value)) {
          // Try to condense the object onto one line
          let res2 = '{ ';
          let key = keys[0];
          res2 += quoteKey(key) + ': ' + visit(value[key], 'compact', 0, false, false);
          res2 += ' }';
          if (res2.length <= condense) return res2;
        }

        let indent1 = showBraces ? token.obj[0] : '';
        let indent2 = indent.repeat(level+1);
        let indent3 = indent.repeat(level);
        let separator2 = separator;
        let isComment = wsc && wsc.c;


        if (showBraces) {
          if (bracesSameLine) result += indent1 + ' ';
          else result += indent1 + eol;
        }

        // Get key order
        let keys2: string[];
        if (wsc && wsc.o) keys2 = wsc.o;
        else if (sortProps) keys2 = keys.sort();
        else keys2 = keys;

        // Format each property
        for (let i = 0; i < keys2.length; i++) {
          let key = keys2[i];
          if (key === '__COMMENTS') continue;
          if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

          let comment = isComment ? wsc.c[key] : undefined;
          if (comment && comment.b) result += indent2 + makeComment(comment.b, "", false).replace(/\n/g, eol + indent2) + eol;
          result += indent2 + quoteKey(key) + token.col[0] + ' ' + 
            visit(value[key], separator2, level+1, false, comment && (commentOnThisLine(comment.a) || comment.b));
          // Only add commas when separator is explicitly set to true
          if (separator2) result += token.com[0];
          if (comment && comment.a) result += makeComment(comment.a, commentOnThisLine(comment.a) ? " " : "", commentOnThisLine(comment.a)).replace(/\n/g, eol + indent2);
          result += eol;
        }

        if (wsc && wsc.e) {
          result += indent2 + wsc.e[0].replace(/\n/g, eol + indent2) + eol;
          if (wsc.e[1]) result += indent2 + wsc.e[1].replace(/\n/g, eol + indent2) + eol;
        }

        result += indent3 + token.obj[1];
        return result;
      }
    }

    // For other types (like undefined, function, etc.), return null
    return wrap(token.lit, 'null');
  }

  /**
   * Wraps a value with tokens
   * @param tk - The token pair to wrap with
   * @param v - The value to wrap
   * @returns The wrapped string
   */

  function wrap(tk: [string, string, number?, number?], v: string): string {
    return tk[0] + v + tk[1];
  }

  /**
   * Checks if a string starts with a newline
   * @param str - The string to check
   * @returns True if the string starts with a newline
   */
  function startsWithNL(str: string): boolean { 
    return !!str && str[str[0] === '\r' ? 1 : 0] === '\n'; 
  }

  /**
   * Checks if a comment is on the same line
   * @param str - The comment string
   * @returns True if the comment is on the same line
   */
  function commentOnThisLine(str?: string): boolean { 
    return !!str && !startsWithNL(str); 
  }

  /**
   * Makes a comment string
   * @param str - The comment string to format
   * @param prefix - Prefix to add before the comment
   * @param trim - Whether to trim leading whitespace
   * @returns The formatted comment string
   */
  function makeComment(str: string, prefix: string, trim?: boolean): string {
    if (!str) return "";
    str = common.forceComment(str);
    let i: number, len = str.length;
    for (i = 0; i < len && str[i] <= ' '; i++) {}
    if (trim && i > 0) str = str.substr(i);
    if (i < len) return prefix + wrap(token.rem, str);
    else return str;
  }

  // Start the stringification process
  let result = "";
  const comments = keepComments ? (common.getComment(value) || {}).r : undefined;
  if (comments && comments[0]) result = comments[0] + '\n';

  // Get the result of stringifying the data
  result += visit(value, separator, 0, true);

  if (comments) result += comments[1] || "";

  return result;
}
