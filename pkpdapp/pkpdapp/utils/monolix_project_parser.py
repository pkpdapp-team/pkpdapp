#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

# based on fourFn.py example from pyparsing
# (https://github.com/pyparsing/pyparsing/blob/master/examples/fourFn.py)
# Copyright 2003-2019 by Paul McGuire
#
import pyparsing as pp
import pyparsing.common as ppc

pp.enable_all_warnings()


class MonolixProjectParser:
    def __init__(self):
        fnumber = ppc.number()
        ident = pp.Regex("[_a-zA-Z][-_a-zA-Z0-9]*")

        lpar, rpar = map(pp.Suppress, "()")
        lcpar, rcpar = map(pp.Suppress, "{}")
        equals = pp.Suppress("=")

        array = pp.Forward()
        func_arg = ident
        func = (
            ident + lpar -
            pp.delimited_list(pp.Group(func_arg), delim=',') + rpar
        )
        array_or_ident_or_number_or_func = (func | ident | fnumber | array)
        array_entry = (ident + equals +
                       array_or_ident_or_number_or_func) | ident | fnumber
        array <<= (
            lcpar +
            pp.delimited_list(pp.Group(array_entry), delim=',') +
            rcpar
        ).set_parse_action(self.parse_array)
        entry_value = ident | pp.QuotedString("'") | array
        entry = (ident + equals + entry_value)

        entry_list = pp.ZeroOrMore(entry).set_parse_action(
            self.parse_list_of_key_values)
        definition_block = pp.Keyword("DEFINITION:") + entry_list
        file_info = pp.Keyword("[FILEINFO]") + entry_list
        file_content = pp.Keyword("[CONTENT]") + entry_list
        data = (
            pp.Keyword("<DATAFILE>") + (
                file_info + file_content
            ).set_parse_action(self.parse_list_of_key_values)
        )
        covariate = pp.Keyword("[COVARIATE]") + (
            entry_list + pp.Opt(definition_block)
        ).set_parse_action(self.parse_add_list_of_key_values)
        individual = pp.Keyword("[INDIVIDUAL]") + (
            entry_list + pp.Opt(definition_block)
        ).set_parse_action(self.parse_add_list_of_key_values)
        longitudinal = pp.Keyword("[LONGITUDINAL]") + (
            entry_list + pp.Opt(definition_block)
        ).set_parse_action(self.parse_add_list_of_key_values)
        model = pp.Keyword("<MODEL>") + (
            covariate + individual + longitudinal
        ).set_parse_action(self.parse_list_of_key_values)

        task_arg = (ident + equals + array_or_ident_or_number_or_func)
        task = (
            ident + lpar -
            pp.Opt(pp.delimited_list(pp.Group(task_arg), delim=',')) + rpar
        )
        task_list = pp.ZeroOrMore(task).set_parse_action(
            self.parse_list_of_key_values)
        tasks = pp.Keyword("[TASKS]") + task_list

        ident_or_string_or_number = ident | fnumber | pp.QuotedString("'")
        key_value = ident + equals + ident_or_string_or_number
        key_value_list = pp.ZeroOrMore(key_value).set_parse_action(
            self.parse_list_of_key_values)
        global_settings = pp.Keyword("GLOBAL:") + key_value_list
        population_settings = pp.Keyword("POPULATION:") + key_value_list
        settings = pp.Keyword("[SETTINGS]") + (
            pp.Opt(global_settings) + pp.Opt(population_settings)
        ).set_parse_action(self.parse_list_of_key_values)
        monolix = pp.Keyword(
            "<MONOLIX>") + (
                tasks + settings
        ).set_parse_action(self.parse_list_of_key_values)

        fit = pp.Keyword("<FIT>") + entry_list
        parameter = pp.Keyword("<PARAMETER>") + entry_list
        src = (data + model + fit + parameter +
               monolix).set_parse_action(self.parse_list_of_key_values)

        monolix_comment = ';' + pp.restOfLine()
        src.ignore(monolix_comment)

        pp.autoname_elements()
        self.parser = src

    def parse_array(self, s: str, loc: int, toks):
        # if all elements are singletons, return a list of the elements
        if all([len(x) == 1 for x in toks]):
            return [[x[0] for x in toks]]
        # if all elements are tuples, return a dict of the elements
        return [{x[0]: x[1] if len(x) > 1 else True for x in toks}]

    def parse_list_of_key_values(self, toks):
        return [{toks[2 * i]: toks[2 * i + 1] for i in range(len(toks) // 2)}]

    def parse_add_list_of_key_values(self, toks):
        return [
            toks[0] | {toks[2 * i + 1]: toks[2 * i + 2]
                       for i in range((len(toks) - 1) // 2)}
        ]

    def parse(self, project_str, parseAll=True) -> dict:
        try:
            result = self.parser.parseString(project_str, parseAll=parseAll)
        except pp.ParseException as err:
            raise RuntimeError(err.explain())
        return result.asList()[0]
