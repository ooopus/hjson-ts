/**
 * Hjson stringifier
 * Converts JavaScript values to Hjson format
 */

import { StringifyOptions } from './types/stringify-options';
import { Token, TokenEntry } from './types/token';
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

  const ColorToken: Token = {
      obj: ['\x1b[37m{\x1b[0m', '\x1b[37m}\x1b[0m'],
      arr: ['\x1b[37m[\x1b[0m', '\x1b[37m]\x1b[0m'],
      key: ['\x1b[33m', '\x1b[0m'],
      qkey: ['\x1b[33m"', '"\x1b[0m'],
      col: ['\x1b[37m:\x1b[0m', ''],
      com: ['\x1b[37m,\x1b[0m', ''],
      str: ['\x1b[37;1m', '\x1b[0m'],
      qstr: ['\x1b[37;1m"', '"\x1b[0m'],
      mstr: ["\x1b[37;1m'''", "'''\x1b[0m"],
      num: ['\x1b[36;1m', '\x1b[0m'],
      lit: ['\x1b[36m', '\x1b[0m'],
      dsf: ['\x1b[37m', '\x1b[0m'],
      esc: ['\x1b[31m\\', '\x1b[0m'],
      uni: ['\x1b[31m\\u', '\x1b[0m'],
      rem: ['\x1b[35m', '\x1b[0m'],
  };

  const commonRange = '\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff';
  const needsEscape = new RegExp('[\\\\\\"\x00-\x1f' + commonRange + ']', 'g');
  const needsQuotes = new RegExp(
    '^\\s|^"|^\'|^#|^\\/\\*|^\\/\\/|^\\{|^\\}|^\\[|^\\]|^:|^,|\\s$|[\x00-\x1f' +
    commonRange + ']', 'g'
  );

  const startsWithKeyword = new RegExp(
    '^(true|false|null)\\s*((,|\\]|\\}|#|//|/\\*).*)?$'
  );
  const needsEscapeName = /[,{\[}\]\s:#"']|\/\/|\/\*/;
  
  const meta: { [key: string]: string } = {
    '\b': 'b',
    '\t': 't',
    '\n': 'n',
    '\f': 'f',
    '\r': 'r',
    '"': '"',
    '\\': '\\',
  };

  let wrapLen = 0;
  let token = plainToken;

  // Options
  // Handle legacy 'always' quotes option
  if (opt?.quotes === 'always') {
    opt.quotes = 'strings';
  }

  token = opt?.colors ? ColorToken : plainToken;
  // Always add lengths like JS, even if potentially meaningless for colors
  (Object.keys(plainToken) as Array<keyof Token>).forEach(k => {
    const entry = plainToken[k];
    // Ensure the token entry has space for length properties if needed
    if (token[k].length < 4) {
      // Only add if they don't exist, prevents overwriting color tokens if they were structured differently
      (token[k] as any)[2] = entry[0].length;
      (token[k] as any)[3] = entry[1].length;
    } else {
      // If structure allows, assign them regardless
      (token[k] as any)[2] = entry[0].length;
      (token[k] as any)[3] = entry[1].length;
    }
  });
  
  const eol = opt?.eol ?? common.getEOL();
  // Ensure indent is always a string
  const indent = typeof opt?.space === 'number' 
    ? ' '.repeat(opt.space) 
    : (opt?.space ?? '  ');
  const keepComments = opt?.keepWhitespaceAndComments ?? false;
  const bracesSameLine = opt?.bracesSameLine ?? false;
  const quoteKeys = opt?.quotes === 'all' || opt?.quotes === 'keys';
  const quoteStrings = opt?.quotes === 'all' || opt?.quotes === 'strings' || opt?.separator === true;
  const condense = opt?.condense ?? 0;
  let multiline = quoteStrings ? 0 :
                 opt?.multiline === 'std' || opt?.multiline === undefined ? 1 : 
                 opt?.multiline === 'no-tabs' ? 2 : 
                 opt?.multiline === 'off' || opt?.multiline === false ? 0 : 
                 typeof opt?.multiline === 'number' ? opt.multiline : 1;

  const needsEscapeML = new RegExp(
    "'''|^[\\s]+$|[\x00-" +
    (multiline === 2 ? '\x09' : '\x08') +
    '\x0b\x0c\x0e-\x1f' + commonRange + ']',
    'g'
  );

  // Only add commas when separator is explicitly set to true
  const separator = opt?.separator === true ? ',' : '';
  const sortProps = opt?.sortProps ?? false;

  const runDsf = loadDsf(opt?.dsf, 'stringify');


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
  function quotelessString(value: string, separator: string, level: number, isRootObject?: boolean, hasComment?: boolean): string {
    needsQuotes.lastIndex = 0;
    startsWithKeyword.lastIndex = 0;

    if (quoteStrings || 
        hasComment || 
        separator || 
        needsQuotes.test(value) ||
        common.tryParseNumber(value, true) !== undefined ||
        startsWithKeyword.test(value)) {
      
      needsEscape.lastIndex = 0;
      needsEscapeML.lastIndex = 0;
      if (!needsEscapeML.test(value) && !isRootObject && multiline) {
        return mlString(value, level);
      } else if (!needsEscape.test(value)) {
        return wrap(token.qstr, value);
      } else {
        return wrap(token.qstr, quoteReplace(value));
      }
    }
    return wrap(token.str, value);
  }

  /**
   * Formats a multiline string
   * @param value - The string to format
   * @param level - The current indentation level
   * @returns The formatted multiline string
   */
  function mlString(value: string, level: number): string {
    const lines = value.replace(/\r/g, '').split('\n');
    const multilineStringIndent = indent.repeat(level + 1); // Indent of the '''
    const innerIndent = multilineStringIndent; // Indent for lines inside '''

    if (lines.length === 1 && !value.includes("'''")) {
      // Single line without ''' conflict
      return multilineStringIndent + token.mstr[0] + value + token.mstr[1]; // Use ''' wrap the entire string
    }

    let result = multilineStringIndent + token.mstr[0] + eol;
    
    // Process each line with proper indentation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isFirstOrLast = i === 0 || i === lines.length - 1;
      const isEmpty = line.trim() === '';
      
      // Don't indent empty first/last lines
      if (isFirstOrLast && isEmpty) {
        result += line;
      } else {
        result += innerIndent + line;
      }
      
      if (i < lines.length - 1) {
        result += eol;
      }
    }

    // Add final newline and closing quotes with proper indentation
    if (value[value.length - 1] !== '\n') {
      result += eol;
    }
    result += multilineStringIndent + token.mstr[1];
    return result;
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

    // Check if we can insert this key without quotes

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
    const commentInfo = keepComments ? common.getComment(value) : undefined;

    // Handle different value types
    if (value === null) return wrap(token.lit, 'null');

    if (typeof value === 'boolean')
      return wrap(token.lit, value ? 'true' : 'false');

    if (typeof value === 'string') {

      if (quoteStrings)
        return wrap(token.qstr, JSON.stringify(value).slice(1, -1));

      else {
        // Check for multiline string
        if (multiline && !rootObject && value.indexOf('\n') >= 0) {
          // For multiline strings, return a special marker that will be replaced with proper formatting
          return "\n" + mlString(value, level);
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

        let WhitespaceAndComments = commentInfo;

        let result = '';

        // Format the array
        if (condense > 0 && !WhitespaceAndComments && !hasComment) {
          // Try to condense the array onto one line
          let res2 = '[ ';
          for (let i = 0; i < value.length; i++) {
            if (i > 0) res2 += token.com[0] + ' ';
            res2 += visit(value[i], separator, 0, false, false);
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
          let comment = WhitespaceAndComments ? WhitespaceAndComments.a[i] : undefined;
          if (comment && comment.b) result += indent2 + makeComment(comment.b, "", false).replace(/\n/g, eol + indent2) + eol;
          result += indent2 + visit(value[i], separator2, level+1, false, comment && (commentOnThisLine(comment.a) || comment.b));
          // Only add commas between array elements, not after the last one
          if (i < value.length-1) result += token.com[0];
          if (comment && comment.a) result += makeComment(comment.a, commentOnThisLine(comment.a) ? " " : "", commentOnThisLine(comment.a)).replace(/\n/g, eol + indent2);
          result += eol;
        }

        if (WhitespaceAndComments && WhitespaceAndComments.e) {
          result += indent2 + WhitespaceAndComments.e[0].replace(/\n/g, eol + indent2) + eol;
          if (WhitespaceAndComments.e[1]) result += indent2 + WhitespaceAndComments.e[1].replace(/\n/g, eol + indent2) + eol;
        }

        result += indent3 + token.arr[1];
        return result;
      } else {
        // Object
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';

        let WhitespaceAndComments = commentInfo;
        let showBraces = rootObject;
        let result = '';

        // Format the object
        if (condense > 0 && !WhitespaceAndComments && !hasComment && hasSingleProp(value)) {
          // Try to condense the object onto one line
          let res2 = '{';
          let key = keys[0];
          let separator2 = separator;
          res2 += quoteKey(key) + token.col[0] + ' ' + visit(value[key], separator2, 0, false, false);
          res2 += '}';
          if (res2.length <= condense) return res2;
        }

        let indent1 = showBraces ? token.obj[0] : '';
        let indent2 = indent.repeat(level+1);
        let indent3 = indent.repeat(level);
        let separator2 = separator;
        let isComment = WhitespaceAndComments && WhitespaceAndComments.c;


        if (showBraces) {
          if (bracesSameLine) result += indent1 + ' ';
          else result += indent1 + eol;
        }

        // Get key order
        let keys2: string[];
        if (WhitespaceAndComments && WhitespaceAndComments.o) keys2 = WhitespaceAndComments.o;
        else if (sortProps) keys2 = keys.sort();
        else keys2 = keys;

        // Format each property
        for (let i = 0; i < keys2.length; i++) {
          let key = keys2[i];
          if (key === '__COMMENTS') continue;
          if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

          let comment = isComment ? WhitespaceAndComments.c[key] : undefined;
          if (comment && comment.b) result += indent2 + makeComment(comment.b, "", false).replace(/\n/g, eol + indent2) + eol;
          const vs = visit(value[key], separator2, level+1, false, comment && (commentOnThisLine(comment.a) || comment.b));
          result += indent2 + quoteKey(key) + token.col[0] + ' ' + vs;
          // Only add commas when separator is explicitly set to true
          if (separator2) result += token.com[0];
          if (comment && comment.a) result += makeComment(comment.a, commentOnThisLine(comment.a) ? " " : "", commentOnThisLine(comment.a)).replace(/\n/g, eol + indent2);
          result += eol;
        }

        if (WhitespaceAndComments && WhitespaceAndComments.e) {
          result += indent2 + WhitespaceAndComments.e[0].replace(/\n/g, eol + indent2) + eol;
          if (WhitespaceAndComments.e[1]) result += indent2 + WhitespaceAndComments.e[1].replace(/\n/g, eol + indent2) + eol;
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
  function wrap(tk: TokenEntry, v: string): string {
    // Only subtract precomputed lengths if they exist (i.e., not in color mode)
    const lenDelta = (tk[2] ?? 0) + (tk[3] ?? 0);
    // Accumulate length based on value and actual token chars (excluding ANSI if colors)
    if (opt?.colors) {
      // Strip ANSI codes before measuring length
      wrapLen += v.replace(/\x1b\[[0-9;]*m/g, '').length;
    } else {
      // Use numeric indices to access token parts
      const startToken = tk[0];
      const endToken = tk[1];
      wrapLen += startToken.length + endToken.length - lenDelta + v.length;
    }
    return tk[0] + v + tk[1];
  }

  function quoteReplace(string: string): string {
    return string.replace(needsEscape, (a) => {
      const c = meta[a];
      if (typeof c === 'string') return wrap(token.esc, c);
      return wrap(token.uni, ('0000' + a.charCodeAt(0).toString(16)).slice(-4));
    });
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
