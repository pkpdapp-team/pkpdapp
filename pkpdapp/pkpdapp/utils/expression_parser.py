#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

# based on fourFn.py example from pyparsing
# (https://github.com/pyparsing/pyparsing/blob/master/examples/fourFn.py)
# Copyright 2003-2019 by Paul McGuire
#
import math
import operator
from pyparsing import (
    Literal,
    Word,
    Group,
    Forward,
    alphas,
    alphanums,
    Regex,
    ParseException,
    dbl_quoted_string,
    sgl_quoted_string,
    remove_quotes,
    Suppress,
    Keyword,
    delimitedList,
)

epsilon = 1e-12
opn = {
    "+": operator.add,
    "-": operator.sub,
    "*": operator.mul,
    "/": operator.truediv,
    "^": operator.pow,
}

functions = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "exp": math.exp,
    "abs": abs,
    "trunc": int,
    "round": round,
    "sgn": lambda a: -1 if a < -epsilon else 1 if a > epsilon else 0,
    # functionsl with multiple arguments
    "multiply": lambda a, b: a * b,
    "hypot": math.hypot,
    # functions with a variable number of arguments
    "all": lambda *a: all(a),
}


class ExpressionParser:
    """
    expop   :: '^'
    multop  :: '*' | '/'
    addop   :: '+' | '-'
    integer :: ['+' | '-'] '0'..'9'+
    atom    :: real | Parameter '[' string ']'
               | Biomarker '[' string ']'
               | fn '(' expr ')'
               | '(' expr ')'
    factor  :: atom [ expop factor ]*
    term    :: factor [ multop factor ]*
    expr    :: term [ addop term ]*
    """
    # map operator symbols to corresponding arithmetic operations

    def __init__(self):
        # use CaselessKeyword for e and pi, to avoid accidentally matching
        # functions that start with 'e' or 'pi' (such as 'exp'); Keyword
        # and CaselessKeyword only match whole words
        param = Keyword("parameter")
        biomarker = Keyword("biomarker")
        string = (dbl_quoted_string | sgl_quoted_string).setParseAction(
            remove_quotes, self.push_first
        )
        # fnumber = Combine(Word("+-"+nums, nums) +
        #                    Optional("." + Optional(Word(nums))) +
        #                    Optional(e + Word("+-"+nums, nums)))
        # or use provided pyparsing_common.number, but convert back to str:
        # fnumber = ppc.number().addParseAction(lambda t: str(t[0]))
        fnumber = Regex(r"[+-]?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?")
        ident = Word(alphas, alphanums + "_$")

        plus, minus, mult, div = map(Literal, "+-*/")
        lpar, rpar = map(Suppress, "()")
        addop = plus | minus
        multop = mult | div
        expop = Literal("^")

        expr = Forward()
        expr_list = delimitedList(Group(expr))

        # add parse action that replaces the function identifier with a (name,
        # number of args) tuple
        def insert_fn_argcount_tuple(t):
            fn = t.pop(0)
            num_args = len(t[0])
            t.insert(0, (fn, num_args))

        fn_call = (ident + lpar - Group(expr_list) + rpar).setParseAction(
            insert_fn_argcount_tuple
        )
        atom = (
            addop[...] +
            (
                (
                    param + lpar + string + rpar
                ).setParseAction(self.push_first) |
                (
                    biomarker + lpar + string + rpar
                ).setParseAction(self.push_first) |
                (
                    fn_call | fnumber | ident
                ).setParseAction(self.push_first) |
                Group(lpar + expr + rpar)
            )
        ).setParseAction(self.push_unary_minus)

        # by defining exponentiation as "atom [ ^ factor ]..." instead of "atom
        # [ ^ atom ]...", we get right-to-left exponents, instead of
        # left-to-right that is, 2^3^2 = 2^(3^2), not (2^3)^2.
        factor = Forward()
        factor <<= atom + (expop + factor).setParseAction(self.push_first)[...]
        term = factor + (multop + factor).setParseAction(self.push_first)[...]
        expr <<= term + (addop + term).setParseAction(self.push_first)[...]

        self.exprStack = []
        self.bnf = expr

    def push_first(self, toks):
        self.exprStack.append(toks[0])

    def push_unary_minus(self, toks):
        for t in toks:
            if t == "-":
                self.exprStack.append("unary -")
            else:
                break

    def parse(self, string, parseAll=True):
        self.exprStack[:] = []
        self.bnf.parseString(string, parseAll=parseAll)

    def is_valid(self, string):
        try:
            self.parse(string)
            return True
        except ParseException:
            return False

    def get_params(self, string, parseAll=True):
        self.exprStack[:] = []
        self.bnf.parseString(string, parseAll=parseAll)
        ret = []
        for i, op in enumerate(self.exprStack):
            if op == 'parameter' or op == 'biomarker':
                ret.append((op, self.exprStack[i - 1]))
        return list(set(ret))
