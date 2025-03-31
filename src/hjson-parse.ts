/**
 * Hjson parser implementation
 * Parses Hjson format into JavaScript objects
 */

import { ParseOptions } from './types/parse-options';
import * as common from './hjson-common';
import { loadDsf } from './hjson-dsf';

/**
 * Parses a Hjson string into a JavaScript object
 * @param source - The Hjson string to parse
 * @param opt - Optional parsing configuration
 * @returns The parsed JavaScript object
 */
export default function parse(source: string, opt?: ParseOptions): any {
  const text = String(source);
  let at = 0; // Current position in the text
  let ch = ' '; // Current character
  
  // Character escape mappings
  const escapee: Record<string, string> = {
    '"': '"',
    '\'': '\'',
    '\\': '\\',
    '/': '/',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t'
  };

  const keepComments = opt?.keepWsc;
  const runDsf = loadDsf(opt?.dsf, 'parse'); // Domain specific formats
  const legacyRoot = opt?.legacyRoot !== false; // Default to true

  /**
   * Resets the parser position to the beginning
   */
  function resetAt(): void {
    at = 0;
    ch = ' ' as string;
  }

  /**
   * Determines if a character is a punctuator
   * @param c - The character to check
   */
  function isPunctuatorChar(c: string): boolean {
    return c === '{' || c === '}' || c === '[' || c === ']' || c === ',' || c === ':';
  }

  /**
   * Throws an error with position information
   * @param m - The error message
   */
  function error(m: string): never {
    let i: number, col = 0, line = 1;
    for (i = at - 1; i > 0 && text[i] !== '\n'; i--, col++) {}
    for (; i > 0; i--) if (text[i] === '\n') line++;
    throw new Error(m + " at line " + line + "," + col + " >>> " + text.substr(at - col, 20) + " ...");
  }

  /**
   * Gets the next character and advances position
   */
  function next(): string {
    ch = text.charAt(at);
    at++;
    return ch;
  }

  /**
   * Peeks at a character ahead without advancing position
   * @param offs - Offset from current position (default: 0)
   */
  function peek(offs: number = 0): string {
    return text.charAt(at + offs);
  }

  /**
   * Skips whitespace and comments
   */
  function white(): void {
    while (ch) {
      // Skip whitespace
      while (ch && ch <= ' ') next();
      // Skip comments
      if (ch === '#' || ch === '/' && peek() === '/') {
        while (ch && (ch as string) !== '\n') next();
      } else if (ch === '/' && peek() === '*') {
        next(); next();
        while (ch && !(ch === '*' as string && peek() === '/')) next();
        if (ch) { next(); next(); }
      } else break;
    }
  }

  /**
   * Parses a string value
   * @param allowML - Whether to allow multiline strings
   */
  function string(allowML: boolean = false): string {
    let string = '';

    const exitCh = ch;
    while (next()) {
      if (ch === exitCh) {
        next();
        if (allowML && exitCh === "'" && ch === "'" && string.length === 0) {
          // Triple quote indicates a multiline string
          next();
          return mlString();
        } else return string;
      }
      if (ch === '\\') {
        next();
        if (ch as string === 'u') {
          let uffff = 0;
          for (let i = 0; i < 4; i++) {
            next();
            const currentChar = ch as string;
            const c = currentChar.charCodeAt(0);
            let hex: number;
            if (currentChar >= '0' && currentChar <= '9') hex = c - 48;
            else if (ch >= 'a' && ch <= 'f') hex = c - 97 + 0xa;
            else if (ch >= 'A' && ch <= 'F') hex = c - 65 + 0xa;
            else error("Bad \\u char " + ch);
            uffff = uffff * 16 + hex;
          }
          string += String.fromCharCode(uffff);
        } else if (typeof escapee[ch] === 'string') {
          string += escapee[ch];
        } else break;
      } else if (ch === '\n' || ch === '\r') {
        error("Bad string containing newline");
      } else {
        string += ch;
      }
    }
    error("Bad string");
  }

  /**
   * Parses a multiline string value
   */
  function mlString(): string {
    let string = '', triple = 0;

    // Get indentation level
    let indent = 0;
    for (;;) {
      const c = peek(-indent-5);
      if (!c || c === '\n') break;
      indent++;
    }

    // Helper to skip indentation
    function skipIndent() {
      let skip = indent;
      while (ch && ch <= ' ' && ch !== '\n' && skip-- > 0) next();
    }

    // Skip whitespace to newline
    while (ch && ch <= ' ' && ch !== '\n') next();
    if (ch === '\n') { next(); skipIndent(); }

    // Parse multiline string
    for (;;) {
      if (!ch) {
        error("Bad multiline string");
      } else if (ch === '\'') {
        triple++;
        next();
        if (triple === 3) {
          if (string.slice(-1) === '\n') string = string.slice(0, -1); // Remove last EOL
          return string;
        } else continue;
      } else {
        while (triple > 0) {
          string += '\'';
          triple--;
        }
      }
      if (ch === '\n') {
        string += '\n';
        next();
        skipIndent();
      } else {
        if (ch !== '\r') string += ch as string;
        next();
      }
    }
  }

  /**
   * Parses an object key name
   */
  function keyname(): string {
    // Quotes for keys are optional in Hjson
    // unless they include {}[],: or whitespace
    if (ch === '"' || ch === "'") return string(false);

    let name = "", start = at, space = -1;
    for (;;) {
      if (ch === ':') {
        if (!name) error("Found ':' but no key name (for an empty key name use quotes)");
        else if (space >= 0 && space !== name.length) { at = start + space; error("Found whitespace in your key name (use quotes to include)"); }
        return name;
      } else if (ch <= ' ') {
        if (!ch) error("Found EOF while looking for a key name (check your syntax)");
        else if (space < 0) space = name.length;
      } else if (isPunctuatorChar(ch)) {
        error("Found '" + ch + "' where a key name was expected (check your syntax or use quotes if the key name includes {}[],: or whitespace)");
      } else {
        name += ch;
      }
      next();
    }
  }

  /**
   * Extracts comments from the source
   * @param cAt - Starting position
   * @param first - Whether this is the first comment
   */
  function getComment(cAt: number, first?: boolean): string[] {
    let i;
    cAt--;
    // Remove trailing whitespace but only up to EOL
    for (i = at - 2; i > cAt && text[i] <= ' ' && text[i] !== '\n'; i--);
    if (text[i] === '\n') i--;
    if (text[i] === '\r') i--;
    const res = text.substr(cAt, i-cAt+1);
    // Return if we find anything other than whitespace
    for (i = 0; i < res.length; i++) {
      if (res[i] > ' ') {
        const j = res.indexOf('\n');
        if (j >= 0) {
          const c = [res.substr(0, j), res.substr(j+1)];
          if (first && c[0].trim().length === 0) c.shift();
          return c;
        } else return [res];
      }
    }
    return [];
  }

  /**
   * Provides error hints for missing closing brackets
   * @param value - The partially parsed value
   */
  function errorClosingHint(value: any): string {
    function search(value: any, ch: string): string | undefined {
      let i, k, length, res;
      switch (typeof value) {
        case 'string':
          if (value.indexOf(ch) >= 0) res = value;
          break;
        case 'object':
          if (Array.isArray(value)) {
            for (i = 0, length = value.length; i < length; i++) {
              res = search(value[i], ch) || res;
            }
          } else if (value) {
            for (k in value) {
              if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
              res = search(value[k], ch) || res;
            }
          }
      }
      return res;
    }

    function report(ch: string): string {
      const possibleErr = search(value, ch);
      if (possibleErr) {
        return "found '"+ch+"' in a string value, your mistake could be with:\n"+
          "  > "+possibleErr+"\n"+
          "  (unquoted strings contain everything up to the next line!)";
      } else return "";
    }

    return report('}') || report(']');
  }

  /**
   * Parses true, false, null, number or unquoted string
   */
  function tfnns(): any {
    // Hjson strings can be quoteless
    let value = ch;
    if (isPunctuatorChar(ch))
      error("Found a punctuator character '" + ch + "' when expecting a quoteless string (check your syntax)");

    for(;;) {
      next();
      const isEol = ch === '\r' || ch === '\n' || ch === '';
      if (isEol ||
        ch === ',' || ch === '}' || ch === ']' ||
        ch === '#' ||
        ch === '/' && (peek() === '/' || peek() === '*')
        ) {
        // Check for true, false, null, or number values
        const chf = value[0];
        switch (chf) {
          case 'f': if (value.trim() === "false") return false; break;
          case 'n': if (value.trim() === "null") return null; break;
          case 't': if (value.trim() === "true") return true; break;
          default:
            if (chf === '-' || chf >= '0' && chf <= '9') {
              const n = common.tryParseNumber(value);
              if (n !== undefined) return n;
            }
        }
        if (isEol) {
          // Remove whitespace at the end (ignored in quoteless strings)
          value = value.trim();
          const dsfValue = runDsf(value);
          return dsfValue !== undefined ? dsfValue : value;
        }
      }
      value += ch;
    }
  }

  /**
   * Parses an array value
   */
  function array(): any[] {
    const array: any[] = [];
    let comments, cAt, nextComment;
    try {
      if (keepComments) comments = common.createComment(array, { a: [] });
  
      next();
      cAt = at;
      white();
      if (comments) nextComment = getComment(cAt, true).join('\n');
      if (ch === ']') {
        next();
        if (comments) comments.e = [nextComment || "", ""];
        return array;  // Empty array
      }
  
      while (ch) {
        array.push(value());
        cAt = at;
        white();
        // In Hjson the comma is optional and trailing commas are allowed
        if (ch === ',') { next(); cAt = at; white(); }
        if (comments) {
          const c = getComment(cAt);
          if (!comments.a) comments.a = [];
          comments.a.push([nextComment||"", c[0]||""]);
          nextComment = c[1];
        }
        if (ch === ']') {
          next();
          if (comments && comments.a && comments.a.length > 0) {
            comments.a[comments.a.length-1][1] += nextComment||"";
          }
          return array;
        }
        white();
      }
  
      error("End of input while parsing an array (missing ']')");
    } catch (e: any) {
      e.hint = e.hint || errorClosingHint(array);
      throw e;
    }
  }

  /**
   * Parses an object value
   * @param withoutBraces - Whether the object is without braces (root object)
   */
  function object(withoutBraces?: boolean): any {
    let key = "", object: any = {};
    let comments, cAt, nextComment;
  
    try {
      if (keepComments) comments = common.createComment(object, { c: {}, o: [] });
  
      if (!withoutBraces) {
        next();
        cAt = at;
      } else cAt = 1;
  
      white();
      if (comments) nextComment = getComment(cAt, true).join('\n');
      if (ch === '}' && !withoutBraces) {
        if (comments) comments.e = [nextComment || "", ""];
        next();
        return object;  // Empty object
      }
      while (ch) {
        key = keyname();
        white();
        if (ch !== ':') error("Expected ':' instead of '" + ch + "'");
        next();
        // Duplicate keys overwrite the previous value
        object[key] = value();
        cAt = at;
        white();
        // In Hjson the comma is optional and trailing commas are allowed
        if (ch as string === ',') { next(); cAt = at; white(); }
        if (comments) {
          const c = getComment(cAt);

          if (!comments.c) comments.c = {};
          comments.c[key] = [nextComment||"", c[0]||""];
          nextComment = c[1];

          if (!comments.o) comments.o = [];
          comments.o.push(key);
        }
        if (ch as string === '}' && !withoutBraces) {
          next();
          if (comments && comments.c) comments.c[key][1] += nextComment||"";
          return object;
        }
        white();
      }
  
      if (withoutBraces) return object;
      else error("End of input while parsing an object (missing '}')");
    } catch (e: any) {
      e.hint = e.hint || errorClosingHint(object);
      throw e;
    }
  }

  /**
   * Parses any Hjson value
   */
  function value(): any {
    // Parse a Hjson value. It could be an object, an array, a string, a number or a word.

    white();
    switch (ch) {
      case '{': return object();
      case '[': return array();
      case "'":
      case '"': return string(true);
      default: return tfnns();
    }
  }

  /**
   * Checks for trailing characters and handles comments
   * @param v - The parsed value
   * @param c - Array of comments
   */
  function checkTrailing(v: any, c: string[]): any {
    const cAt = at;
    white();
    if (ch) error("Syntax error, found trailing characters");
    if (keepComments) {
      const b = c.join('\n'), a = getComment(cAt).join('\n');
      if (a || b) {
        const comments = common.createComment(v, common.getComment(v));
        comments.r = [b, a];
      }
    }
    return v;
  }

  /**
   * Parses the root value in strict mode
   */
  function rootValue(): any {
    white();
    const c = keepComments ? getComment(1) : [];
    switch (ch) {
      case '{': return checkTrailing(object(), c);
      case '[': return checkTrailing(array(), c);
      default: return checkTrailing(value(), c);
    }
  }

  /**
   * Parses the root value with legacy support
   * In legacy mode, braces for the root object are optional
   */
  function legacyRootValue(): any {
    white();
    const c = keepComments ? getComment(1) : [];
    switch (ch) {
      case '{': return checkTrailing(object(), c);
      case '[': return checkTrailing(array(), c);
    }

    try {
      // Assume we have a root object without braces
      return checkTrailing(object(true), c);
    } catch (e: any) {
      // Test if we are dealing with a single JSON value instead (true/false/null/num/"")
      resetAt();
      try { return checkTrailing(value(), c); }
      catch (e2) { throw e; } // Throw original error
    }
  }

  // Start parsing
  if (typeof source !== "string") throw new Error("source is not a string");
  resetAt();
  return legacyRoot ? legacyRootValue() : rootValue();
}
