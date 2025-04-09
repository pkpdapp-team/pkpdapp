/*
Language: MMT
Author: Jim O'Donnell <james.odonnell@dtc.ox.ac.uk>
Description: language definition for Myokit models.
Category: config
*/

const FUNCTIONS = [
  "if",
  "cos",
  "sin",
  "tan",
  "acos",
  "asin",
  "atan",
  "exp",
  "log",
  "log10",
  "sqrt",
  "abs",
  "ceil",
  "floor",
];

export default function mmt(hljs) {
  // units inside in statements
  const UNIT_RE = /[\w\d*/^]+/;
  // [[model]] or [component]
  const COMPONENT_HEADING_MODE = {
    scope: "section",
    begin: /^\[+/,
    end: /\]+$/,
    keywords: {
      $pattern: hljs.IDENT_RE,
      keyword: "model PDCompartment PKCompartment environment",
    },
  };
  // field: value
  const METADATA_MODE = {
    scope: "meta",
    begin: [/\s*/, /\w+/, /:\s*/, /.+$/],
    beginScope: { 2: "keyword", 4: "comment" },
    keywords: {
      $pattern: hljs.IDENT_RE,
      keyword: "author name desc",
    },
    end: /\w\n/,
    endsWithParent: true,
  };
  // (PD|PK)Compartment.variable
  const SCOPED_VARIABLE_MODE = {
    begin: [/(PD|PK)Compartment/, /\./, hljs.UNDERSCORE_IDENT_RE],
    beginScope: { 1: "keyword", 3: "variable" },
  };
  const IDENTIFIER_MODE = {
    scope: "variable",
    begin: hljs.UNDERSCORE_IDENT_RE,
    end: /[\n+\-*/^]?/,
    excludesEnd: true,
  };
  const NUMBER_MODE = {
    scope: "number",
    begin: hljs.C_NUMBER_RE,
    end: /\n?/,
  };
  const UNIT_MODE = {
    scope: "string",
    begin: UNIT_RE,
    end: /\n?/,
  };
  // end of line descriptions
  const COMMENT_MODE = {
    scope: "comment",
    begin: [/:\s*/, /.+$/],
    beginScope: { 1: "punctuation", 2: "comment" },
    end: /\n/,
  };
  // in [value] expressions
  const IN_VALUE_MODE = {
    scope: "expression",
    begin: [/\s*in/, /\s+\[/],
    beginScope: {
      1: "keyword",
      2: "punctuation",
    },
    end: /\]/,
    endScope: "punctuation",
    contains: [NUMBER_MODE, UNIT_MODE],
  };
  // function(...args)
  const FUNCTION_MODE = {
    scope: "expression",
    begin: /\w+\(/,
    keywords: {
      $pattern: hljs.IDENT_RE,
      keyword: FUNCTIONS,
    },
    contains: [NUMBER_MODE, SCOPED_VARIABLE_MODE, IDENTIFIER_MODE],
    end: /\)\n/,
  };
  // dot(variable) = expression : description
  const DOT_VARIABLE_MODE = {
    scope: "expression",
    begin: [/dot\(/, hljs.UNDERSCORE_IDENT_RE, /\)/, /\s*=\s*/],
    beginScope: {
      1: "keyword",
      2: "variable",
      3: "keyword",
      4: "operator",
    },
    contains: [
      NUMBER_MODE,
      SCOPED_VARIABLE_MODE,
      IN_VALUE_MODE,
      COMMENT_MODE,
      FUNCTION_MODE,
      METADATA_MODE,
      IDENTIFIER_MODE,
    ],
    end: /\n/,
  };
  // variable = variable | number | expression | if() : description
  const VARIABLE_MODE = {
    scope: "expression",
    begin: [hljs.UNDERSCORE_IDENT_RE, /\s*=\s*/],
    beginScope: { 1: "variable", 2: "operator" },
    contains: [
      NUMBER_MODE,
      SCOPED_VARIABLE_MODE,
      IN_VALUE_MODE,
      COMMENT_MODE,
      FUNCTION_MODE,
      METADATA_MODE,
      IDENTIFIER_MODE,
    ],
    end: /\n/,
  };
  return {
    aliases: ["MMT", "mmt"],
    case_insensitive: false,
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      COMPONENT_HEADING_MODE,
      METADATA_MODE,
      IN_VALUE_MODE,
      DOT_VARIABLE_MODE,
      COMMENT_MODE,
      SCOPED_VARIABLE_MODE,
      VARIABLE_MODE,
      {
        scope: "punctuation",
        begin: /[[()\]]+/,
      },
    ],
  };
}
