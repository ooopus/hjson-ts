/**
 * Hjson Domain Specific Format (DSF) support
 * This module provides functions to load and manage DSF modules for parsing and stringifying.
 */

import { DSF } from './types/dsf';

/**
 * Loads DSF modules for parsing or stringifying
 * @param col Array of DSF modules
 * @param type Operation type: 'parse' or 'stringify'
 * @returns A function that applies the DSF functions to a value
 */
export function loadDsf(col: DSF[] | undefined, type: 'parse' | 'stringify'): (value: any) => any {
  if (!Array.isArray(col)) {
    if (col) throw new Error("dsf option must contain an array!");
    else return nopDsf;
  } else if (col.length === 0) {
    return nopDsf;
  }

  const dsfFunctions: ((value: any) => any)[] = [];

  col.forEach((x) => {
    if (!x.name || typeof x.parse !== 'function' || typeof x.stringify !== 'function') {
      throw new Error("extension does not match the DSF interface");
    }

    dsfFunctions.push((value: any) => {
      try {
        if (type === "parse") {
          return x.parse(value);
        } else if (type === "stringify") {
          const res = x.stringify(value);
          // Validate the result
          if (res !== undefined && (typeof res !== "string" ||
            res.length === 0 ||
            res[0] === '"' ||
            Array.from(res).some((c) => isInvalidDsfChar(c)))) {
            throw new Error("value may not be empty, start with a quote or contain a punctuator character except colon: " + res);
          }
          return res;
        } else {
          throw new Error("Invalid type");
        }
      } catch (e) {
        throw new Error(`DSF-${x.name} failed; ${(e as Error).message}`);
      }
    });
  });

  return (value: any) => runDsf(dsfFunctions, value);
}

/**
 * Runs DSF functions on a value
 * @param dsf Array of DSF functions
 * @param value The value to process
 * @returns The processed value or undefined
 */
function runDsf(dsf: ((value: any) => any)[], value: any): any {
  if (dsf) {
    for (let i = 0; i < dsf.length; i++) {
      const res = dsf[i](value);
      if (res !== undefined) return res;
    }
  }
  return undefined;
}

/**
 * No-op DSF function
 * @param value The value to process
 * @returns Always returns undefined
 */
function nopDsf(_value: any): any {
  return undefined;
}

/**
 * Checks if a character is invalid for DSF
 * @param c The character to check
 * @returns True if the character is invalid, otherwise false
 */
function isInvalidDsfChar(c: string): boolean {
  return c === '{' || c === '}' || c === '[' || c === ']' || c === ',' || c === '"';
}

/**
 * Built-in DSF modules
 * Provides default implementations for hex, date, and math DSFs.
 */
export const dsf: Record<string, DSF> = {
  hex: {
    name: "hex",
    description: "parse hex number, e.g. 0xff (returns a number)",
    parse: function(v: any) {
      if (typeof v !== 'string') return undefined;
      const m = /^\s*(?:0x)?([0-9a-fA-F]+)\s*$/.exec(v);
      if (m) {
        const r = parseInt(m[1], 16);
        if (r >= 0) return r;
      }
      return undefined;
    },
    stringify: function(value: any) {
      return undefined;
    }
  },
  date: {
    name: "date",
    description: "support ISO dates",
    parse: function(value: any) {
      if (typeof value !== 'string') return undefined;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:.\d+)(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
        const dt = Date.parse(value);
        if (!isNaN(dt)) return new Date(dt);
      }
      return undefined;
    },
    stringify: function(value: any) {
      if (Object.prototype.toString.call(value) === '[object Date]') {
        const dt = value.toISOString();
        if (dt.indexOf("T00:00:00.000Z", dt.length - 14) !== -1) return dt.substr(0, 10);
        else return dt;
      }
      return undefined;
    }
  },
  math: {
    name: "math",
    description: "support for Inf/inf, -Inf/-inf, Nan/naN and -0",
    parse: function(value: any) {
      if (typeof value !== 'string') return undefined;
      switch (value) {
        case "+inf":
        case "inf":
        case "+Inf":
        case "Inf": return Infinity;
        case "-inf":
        case "-Inf": return -Infinity;
        case "nan":
        case "NaN": return NaN;
        default: return undefined;
      }
    },
    stringify: function(value: any) {
      if (typeof value !== 'number') return undefined;
      if (1 / value === -Infinity) return "-0"; // 0 === -0
      if (value === Infinity) return "Inf";
      if (value === -Infinity) return "-Inf";
      if (isNaN(value)) return "NaN";
      return undefined;
    }
  }
};

/**
 * Standard DSF modules
 * Provides standard DSF implementations with optional configurations.
 */
export const std = {
  math: (_opt?: any): DSF => ({...dsf.math}),
  hex: (opt?: any): DSF => {
    const out = opt && opt.out;
    return {
      name: "hex",
      description: "parse hexadecimal numbers prefixed with 0x",
      parse: function(value: any) {
        if (typeof value !== 'string') return undefined;
        if (/^0x[0-9A-Fa-f]+$/.test(value))
          return parseInt(value, 16);
        return undefined;
      },
      stringify: function(value: any) {
        if (out && Number.isInteger(value))
          return "0x" + value.toString(16);
        return undefined;
      }
    };
  },
  date: (_opt?: any): DSF => ({...dsf.date})
};