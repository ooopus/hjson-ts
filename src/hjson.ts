/**
 * Hjson - a user interface for JSON
 * 
 * This file creates a Hjson object with parse and stringify methods.
 */

import parse from './hjson-parse';
import stringify from './hjson-stringify';
import * as common from './hjson-common';
import * as comments from './hjson-comments';
import { dsf as dsfModules } from './hjson-dsf';
import { ParseOptions, StringifyOptions } from './types';

/**
 * Gets the current end of line character sequence
 */
function endOfLine(): string {
  return common.getEOL();
}

/**
 * Sets the end of line character sequence
 * @param eol The end of line character sequence ('\n' or '\r\n')
 */
function setEndOfLine(eol: string): void {
  if (eol === '\n' || eol === '\r\n') common.setEOL(eol);
}

/**
 * Round trip shortcut for parsing and stringifying with comments preserved
 */
const rt = {
  /**
   * Parses Hjson text with comments preserved
   * @param text The Hjson text to parse
   * @param options Parse options
   */
  parse: function(text: string, options?: ParseOptions): any {
    const opts = options || {};
    opts.keepWhitespaceAndComments = true;
    return parse(text, opts);
  },

  /**
   * Stringifies a value to Hjson with comments preserved
   * @param value The value to stringify
   * @param options Stringify options
   */
  stringify: function(value: any, options?: StringifyOptions): string {
    const opts = options || {};
    opts.keepWhitespaceAndComments = true;
    return stringify(value, opts);
  },
};

/**
 * The version of this library
 */
const version = '1.0.0';

/**
 * Standard DSF modules
 */
const dsf = dsfModules;

// Export the Hjson API
export default {
  parse,
  stringify,
  endOfLine,
  setEndOfLine,
  version,
  rt,
  comments,
  dsf,
};

// Also export individual functions and objects
export {
  parse,
  stringify,
  endOfLine,
  setEndOfLine,
  version,
  rt,
  comments,
  dsf,
};