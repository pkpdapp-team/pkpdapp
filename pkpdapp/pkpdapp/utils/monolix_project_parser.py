#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

# based on fourFn.py example from pyparsing
# (https://github.com/pyparsing/pyparsing/blob/master/examples/fourFn.py)
# Copyright 2003-2019 by Paul McGuire
#
from configparser import ParsingError
from dataclasses import dataclass
import pprint
from re import S

import myokit
import numbers
import pyparsing as pp
import pyparsing.common as ppc

pp.enable_all_warnings()


class MonolixProjectParser:
    def __init__(self):
        fnumber = ppc.number()
        ident = pp.Regex("[_a-zA-Z][-_a-zA-Z0-9]*")

        lpar, rpar = map(pp.Suppress, "()")
        quote= pp.Suppress("'")
        lcpar, rcpar = map(pp.Suppress, "{}")
        equals = pp.Suppress("=")

        array = pp.Forward()
        func_arg = ident
        func = (
            ident + lpar -
            pp.delimited_list(pp.Group(func_arg), delim=',') + rpar
        )
        array_or_ident_or_number_or_func = (func | ident | fnumber | array)
        array_entry = (ident + equals + array_or_ident_or_number_or_func) | ident | fnumber
        array <<= (lcpar + pp.delimited_list(pp.Group(array_entry), delim=',') + rcpar).add_condition(self.validate_array).set_parse_action(self.parse_array)
        entry_value = ident | pp.QuotedString("'") | array
        entry = (ident + equals + entry_value)
        

        entry_list = pp.ZeroOrMore(entry).set_parse_action(self.parse_list_of_key_values)
        definition_block = pp.Keyword("DEFINITION:") + entry_list 
        file_info = pp.Keyword("[FILEINFO]") + entry_list
        file_content = pp.Keyword("[CONTENT]") + entry_list
        data = (
            pp.Keyword("<DATAFILE>") + (file_info + file_content).set_parse_action(self.parse_list_of_key_values)
        )
        covariate = pp.Keyword("[COVARIATE]") + (entry_list + pp.Opt(definition_block)).set_parse_action(self.parse_list_of_key_values)
        individual = pp.Keyword("[INDIVIDUAL]") + (entry_list + pp.Opt(definition_block)).set_parse_action(self.parse_list_of_key_values)
        longitudinal = pp.Keyword("[LONGITUDINAL]") + (entry_list + pp.Opt(definition_block)).set_parse_action(self.parse_list_of_key_values)
        model = pp.Keyword("<MODEL>") + (covariate + individual + longitudinal).set_parse_action(self.parse_list_of_key_values)
      
        task_arg = (ident + equals + array_or_ident_or_number_or_func)
        task = (
            ident + lpar -
            pp.Opt(pp.delimited_list(pp.Group(task_arg), delim=',')) + rpar
        )
        tasks = pp.Keyword("[TASKS]") + pp.Group(pp.ZeroOrMore(task))

        ident_or_string_or_number = ident | fnumber | pp.QuotedString("'")
        key_value = ident + equals + ident_or_string_or_number
        global_settings = pp.Keyword("GLOBAL:") + pp.Group(pp.ZeroOrMore(key_value))
        population_settings = pp.Keyword("POPULATION:") + pp.Group(pp.ZeroOrMore(key_value))
        settings = pp.Keyword("[SETTINGS]") + pp.Opt(global_settings) + pp.Opt(population_settings)
        monolix = pp.Keyword("<MONOLIX>") + tasks + settings

        fit = pp.Keyword("<FIT>") + pp.Group(pp.ZeroOrMore(entry))
        parameter = pp.Keyword("<PARAMETER>") + pp.Group(pp.ZeroOrMore(entry))
        src = (data + model + fit + parameter + monolix).set_parse_action(self.parse_list_of_key_values)

        monolix_comment = ';' + pp.restOfLine()
        src.ignore(monolix_comment)

        pp.autoname_elements()
        self.parser = src
        self.exprStack = []
        self.variables = {}
        self.pk = []
        self.myokit_model = myokit.Model()
        self.units = {}
        self.administration_id = None
        self.tlag = None
        self.direct_dosing = None

    def validate_array(self, toks):
        return (
            all([len(x) == 1 for x in toks]) or 
            all([len(x) == 2 for x in toks])
        )

    def parse_array(self, s: str, loc: int, toks):
        print('parse_array', toks)
        print('parse_array', pprint.pprint(toks.asList()))
        # if all elements are singletons, return a list of the elements
        if all([len(x) == 1 for x in toks]):
            return [[x[0] for x in toks]]
        # if all elements are tuples, return a dict of the elements
        if all([len(x) == 2 for x in toks]):
            return [{x[0]: x[1] for x in toks}]
        return None

    def parse_list_of_key_values(self, toks):
        return [{toks[2*i]: toks[2*i + 1] for i in range(len(toks)//2)}]

    def parse_data(self, toks):
        print('parse_data', toks)

    def initialise_model(self):
        self.myokit_model = myokit.Model()
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
                self.administration_id = adm
                tlag = args.get('Tlag', args.get(2, 0))
                self.tlag = tlag
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

    def parse(self, project_str, parseAll=True) -> myokit.Model:
        try:
            self.initialise_model()
            print('parsing model', project_str)
            result = self.parser.parseString(project_str, parseAll=parseAll)
            pprint.pprint(result)
        except pp.ParseException as err:
            raise RuntimeError(err.explain())
        return self.myokit_model, \
            (self.administration_id, self.tlag, self.direct_dosing)
