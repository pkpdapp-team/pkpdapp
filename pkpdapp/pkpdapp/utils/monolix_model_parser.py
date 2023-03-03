#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

# based on fourFn.py example from pyparsing
# (https://github.com/pyparsing/pyparsing/blob/master/examples/fourFn.py)
# Copyright 2003-2019 by Paul McGuire
#
from dataclasses import dataclass

import myokit
import numbers
import pyparsing as pp
import pyparsing.common as ppc

pp.enable_all_warnings()

binops = {
    '/': myokit.Divide,
    '*': myokit.Multiply,
    '-': myokit.Minus,
    '+': myokit.Plus,
}


@dataclass
class Variable:
    name: str
    constant: bool
    state: bool


class MonolixModelParser:
    """
    expop   :: '^'
    multop  :: '*' | '/'
    addop   :: '+' | '-'
    integer :: ['+' | '-'] '0'..'9'+
    atom    :: real
               | ident
               | '(' expr ')'
    factor  :: atom [ expop factor ]*
    term    :: factor [ multop factor ]*
    expr    :: term [ addop term ]*
    eqn     :: term
    """
    # map operator symbols to corresponding arithmetic operations

    def __init__(self):
        # fnumber = Combine(Word("+-"+nums, nums) +
        #                    Optional("." + Optional(Word(nums))) +
        #                    Optional(e + Word("+-"+nums, nums)))
        # or use provided pyparsing_common.number, but convert back to str:
        fnumber = ppc.number()
        ident = pp.Regex("[_a-zA-Z][_a-zA-Z0-9]*")
        ident_0 = pp.Regex("[_a-zA-Z][_a-zA-Z0-9]*_0")
        ddt_ident = pp.Regex("ddt_[_a-zA-Z][_a-zA-Z0-9]*")

        plus, minus, mult, div = map(pp.Literal, "+-*/")
        lpar, rpar = map(pp.Suppress, "()")
        lcpar, rcpar = map(pp.Suppress, "{}")
        addop = plus | minus
        multop = mult | div
        expop = pp.Literal("^")
        equals = pp.Suppress("=")

        expr = pp.Forward()
        atom = (
            addop[...] + (
                (fnumber | ident).set_parse_action(self.push_first) |
                pp.Group(lpar + expr + rpar)
            )
        ).set_parse_action(self.push_unary_minus)

        # by defining exponentiation as "atom [ ^ factor ]..." instead of "atom
        # [ ^ atom ]...", we get right-to-left exponents, instead of
        # left-to-right that is, 2^3^2 = 2^(3^2), not (2^3)^2.
        factor = pp.Forward()
        factor <<= (
            atom +
            (expop + factor).set_parse_action(self.push_first)[...]
        )
        term = (
            factor +
            (multop + factor).set_parse_action(self.push_first)[...]
        )
        expr <<= (
            term +
            (addop + term).set_parse_action(self.push_first)[...]
        )

        ode_type = pp.Keyword('odeType') + equals + (pp.Keyword('stiff') |
                                                     pp.Keyword('nonStiff'))
        equation = (
            ident + equals +
            pp.Group(expr).set_parse_action(self.construct_expr)
        )
        initial_condition = (
            ident_0 + equals +
            pp.Group(expr).set_parse_action(self.construct_expr)
        )
        rate_equation = (
            ddt_ident + equals +
            pp.Group(expr).set_parse_action(self.construct_expr)
        )

        fn_value = fnumber | ident
        fn_arg = (ident + equals + fn_value) | fn_value
        fn_call = (
            ident + lpar -
            pp.delimited_list(pp.Group(fn_arg), delim=',') + rpar
        )

        pk_block = ("PK:" + (
            pp.Group(fn_call)
        )[...]).set_parse_action(self.construct_pk)

        equation_block = pp.Keyword("EQUATION:") + (
            ode_type |
            rate_equation.set_parse_action(
                self.construct_rate_equation
            ) |
            initial_condition.set_parse_action(
                self.construct_initial_condition
            ) |
            equation.set_parse_action(
                self.construct_equation
            )

        )[...]

        output_block = pp.Keyword("OUTPUT:") + (
            ident + equals +
            lcpar - pp.delimited_list(ident, delim=',') +
            rcpar
        )

        inputs = (
            pp.Keyword("input") + equals + lcpar -
            pp.delimited_list(
                ident, delim=','
            ).set_parse_action(self.construct_inputs) +
            rcpar
        )

        longitudinal_keyword = pp.Keyword("[LONGITUDINAL]")

        longitudinal = (
            longitudinal_keyword +
            inputs +
            (
                pk_block & equation_block & output_block
            )
        )

        src = "DESCRIPTION:" + pp.SkipTo(longitudinal_keyword) + longitudinal

        monolix_comment = ';' + pp.restOfLine()
        src.ignore(monolix_comment)

        pp.autoname_elements()
        self.parser = src
        self.exprStack = []
        self.variables = {}
        self.pk = []
        self.myokit_model: myokit.Model = myokit.Model()
        self.units = {}
        self.administration_id = None
        self.tlag = None
        self.direct_dosing = None
        self.dosed_compartment = None

    def initialise_model(self):
        self.myokit_model: myokit.Model = myokit.Model()
        root_cmp = self.myokit_model.add_component('root')
        t = self.get_or_construct_var('t', root_cmp)
        t.set_binding('time')

    def push_first(self, toks):
        self.exprStack.append(toks[0])

    def push_unary_minus(self, toks):
        for t in toks:
            if t == "-":
                self.exprStack.append("unary -")
            else:
                break

    def construct_pk(self, toks):
        compartments = {}
        for line in toks[1:]:
            fn_name, *tok_args = line
            args = {}
            for i, arg in enumerate(tok_args):
                if len(arg) == 2:
                    [name, value] = arg
                    args[name] = value
                else:
                    [value] = arg
                    args[i] = value

            if fn_name == 'compartment':
                cmt = args.get('cmt', args.get(0, 1))
                if not isinstance(cmt, str) or cmt[0].isalpha():
                    cmt = f'cmt{cmt}'
                amount = args.get('amount', args.get(1, None))
                volume = args.get('volume', args.get(2, 1))
                concentration = args.get('concentration', args.get(3, None))
                comp = self.myokit_model.add_component(cmt)
                if isinstance(volume, str):
                    volume_var = self.get_or_construct_var(volume, comp)
                else:
                    volume_var = myokit.Number(volume)
                if amount:
                    amount_var = self.get_or_construct_var(amount, comp)
                else:
                    raise pp.ParseException(
                        f'arg "amount" required for compartment {cmt}')
                if concentration:
                    conc_var = self.get_or_construct_var(concentration, comp)
                    conc_var.set_rhs(myokit.Divide(amount_var, volume_var))
                compartments[cmt] = amount_var

            elif fn_name == 'iv':
                cmt = args.get('cmt', args.get(0, 1))
                if not isinstance(cmt, str) or cmt[0].isalpha():
                    cmt = f'cmt{cmt}'
                adm = args.get('adm', args.get(1, 1))
                if self.administration_id is not None:
                    raise pp.ParseException(
                        'only a single administration id supported'
                    )
                self.administration_id = str(adm)
                tlag = args.get('Tlag', args.get(2, 0))
                self.tlag = float(tlag)
                # p = args.get('p', args.get(3, 1))

                if cmt not in compartments:
                    raise pp.ParseException(
                        f'compartment {cmt} not found in pk block'
                    )
                amount_var = compartments[cmt]
                if not amount_var.is_state():
                    amount_var.promote(0)
                direct = True
                self.direct_dosing = direct
                self.dosed_compartment = cmt

    def construct_inputs(self, toks):
        for name in toks:
            _ = self.get_or_construct_var(name)

    def construct_expr(self, toks):
        toks[0] = self.construct_myokit_expr(self.exprStack)

    def get_or_construct_var(self, name, compartment=None):
        if compartment is None:
            compartment = self.myokit_model.get('root')
        if name not in self.variables:
            var = compartment.add_variable(name)
            var.set_rhs(0)
            if name in self.units:
                unit = myokit.Unit.parse_simple(self.units[name])
            else:
                unit = None
            var.set_unit(unit)
            self.variables[name] = var
        return self.variables[name]

    def construct_equation(self, toks):
        name, expr = toks
        var = self.get_or_construct_var(name)
        var.set_rhs(expr)

    def construct_rate_equation(self, toks):
        name, expr = toks
        # get rid of ddt_
        name = name[4:]
        var = self.get_or_construct_var(name)
        if not var.is_state():
            var.promote(0)
        var.set_rhs(expr)

    def construct_initial_condition(self, toks):
        name, expr = toks
        # get rid of _0
        name = name[:-2]
        var = self.get_or_construct_var(name)

        if var == self.myokit_model.time():
            var.set_rhs(expr)
        elif var.is_state():
            var.demote()
            var.promote(expr)
        else:
            var.promote(expr)

    def construct_myokit_expr(self, s):
        op = s.pop()
        if isinstance(op, numbers.Number):
            return myokit.Number(op)
        if op == "unary -":
            return myokit.PrefixMinus(self.construct_myokit_expr(s))
        if op in "+-*/^":
            # note: operands are pushed onto the stack in reverse order
            op2 = self.construct_myokit_expr(s)
            op1 = self.construct_myokit_expr(s)
            return binops[op](op1, op2)
        elif op[0].isalpha():
            var = self.get_or_construct_var(op)
            return myokit.Name(var)
        else:
            raise pp.ParseException(f'unknown op {op}')

    def parse(self, model_str, parseAll=True):
        try:
            self.initialise_model()
            self.parser.parseString(model_str, parseAll=parseAll)
        except pp.ParseException as err:
            raise RuntimeError(err.explain())
        return self.myokit_model, \
            (
                self.administration_id, self.dosed_compartment,
                self.tlag, self.direct_dosing
            )
