#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models.mechanistic_model import MyokitModelMixin
from myokit.formats.sbml import SBMLParsingError
import myokit


class ValidSbml:
    def __call__(self, value):
        try:
            MyokitModelMixin.parse_sbml_string(value)
        except SBMLParsingError as e:
            raise serializers.ValidationError(e)


class ValidMmt:
    def __call__(self, value):
        try:
            MyokitModelMixin.parse_mmt_string(value)
        except myokit.ParseError as e:
            raise serializers.ValidationError(e)
