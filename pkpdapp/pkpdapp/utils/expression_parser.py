

# based on fourFn.py example from pyparsing
# (https://github.com/pyparsing/pyparsing/blob/master/examples/fourFn.py)
# Copyright 2003-2019 by Paul McGuire
#
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
    CaselessKeyword,
    Suppress,
    Keyword,
    delimitedList,
)
import math
import operator


class ExpressionParser:
    """
    expop   :: '^'
    multop  :: '*' | '/'
    addop   :: '+' | '-'
    integer :: ['+' | '-'] '0'..'9'+
    atom    :: real | Parameter '[' string ']' | Biomarker '[' string ']' | fn '(' expr ')' | '(' expr ')'
    factor  :: atom [ expop factor ]*
    term    :: factor [ multop factor ]*
    expr    :: term [ addop term ]*
    """
    # map operator symbols to corresponding arithmetic operations
    epsilon = 1e-12
    opn = {
        "+": operator.add,
        "-": operator.sub,
        "*": operator.mul,
        "/": operator.truediv,
        "^": operator.pow,
    }

    fn = {
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

    def __init__(self):
        # use CaselessKeyword for e and pi, to avoid accidentally matching
        # functions that start with 'e' or 'pi' (such as 'exp'); Keyword
        # and CaselessKeyword only match whole words
        e = CaselessKeyword("E")
        pi = CaselessKeyword("PI")
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
        # add parse action that replaces the function identifier with a (name, number of args) tuple

        def insert_fn_argcount_tuple(t):
            fn = t.pop(0)
            num_args = len(t[0])
            t.insert(0, (fn, num_args))

        fn_call = (ident + lpar - Group(expr_list) + rpar).setParseAction(
            insert_fn_argcount_tuple
        )
        atom = (
            addop[...]
            + (
                (param + lpar + string + rpar).setParseAction(self.push_first)
                | (biomarker + lpar + string + rpar).setParseAction(self.push_first)
                | (fn_call | fnumber | ident).setParseAction(self.push_first)
                | Group(lpar + expr + rpar)
            )
        ).setParseAction(self.push_unary_minus)

        # by defining exponentiation as "atom [ ^ factor ]..." instead of "atom [ ^ atom ]...", we get right-to-left
        # exponents, instead of left-to-right that is, 2^3^2 = 2^(3^2), not (2^3)^2.
        factor = Forward()
        factor <<= atom + (expop + factor).setParseAction(self.push_first)[...]
        term = factor + (multop + factor).setParseAction(self.push_first)[...]
        expr <<= term + (addop + term).setParseAction(self.push_first)[...]

        self.exprStack = []
        self.bnf = expr

    def push_first(self, toks):
        print('push_first', toks)
        self.exprStack.append(toks[0])

    def push_unary_minus(self, toks):
        for t in toks:
            if t == "-":
                self.exprStack.append("unary -")
            else:
                break

    def evaluate_stack(self, s):
        op, num_args = s.pop(), 0
        if isinstance(op, tuple):
            op, num_args = op
        if op == "unary -":
            return -self.evaluate_stack(s)
        if op in "+-*/^":
            # note: operands are pushed onto the stack in reverse order
            op2 = self.evaluate_stack(s)
            op1 = self.evaluate_stack(s)
            return opn[op](op1, op2)
        elif op == "PI":
            return math.pi  # 3.1415926535
        elif op == "E":
            return math.e  # 2.718281828
        elif op in fn:
            # note: args are pushed onto the stack in reverse order
            args = reversed([self.evaluate_stack(s) for _ in range(num_args)])
            return fn[op](*args)
        elif op[0].isalpha():
            raise Exception("invalid identifier '%s'" % op)
        else:
            # try to evaluate as int first, then as float if int fails
            try:
                return int(op)
            except ValueError:
                return float(op)

    def parse(self, string, parseAll=True):
        self.exprStack[:] = []
        self.bnf.parseString(string, parseAll=parseAll)

    def is_valid(self, string, parseAll=True):
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
            print('get_params stack', i, op, type(op))
            if op == 'parameter' or op == 'biomarker':
                ret.append((op, self.exprStack[i - 1]))
        print('get_params return', ret)
        return list(set(ret))
