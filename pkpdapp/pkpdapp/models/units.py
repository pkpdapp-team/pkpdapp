#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.db.models import Q
import myokit

# https://stackoverflow.com/questions/14711203/perform-a-logical-exclusive-or-on-a-django-q-object
class QQ:
    def __xor__(self, other):    
        not_self = self.clone()
        not_other = other.clone()
        not_self.negate()
        not_other.negate()

        x = self & not_other
        y = not_self & other

        return x | y


class Unit(models.Model):
    """
    Model replicating the Unit class from myokit

    Each Unit consists of:

    - A list of seven floats: these are the exponents for the basic
      SI units: [g, m, s, A, K, cd, mol]. Gram is used instead of the
      SI defined kilogram to create a more coherent syntax.

    - A multiplier. This includes both quantifiers (such as milli, kilo,
      Mega etc) and conversion factors (for example 1inch = 2.54cm).
      Multipliers are specified in powers of 10, e.g. to create an inch
      use the multiplier log10(2.54).
    """

    symbol = models.CharField(
        max_length=50, help_text='symbol for unit display'
    )
    g = models.FloatField(default=0, help_text='grams exponent')
    m = models.FloatField(default=0, help_text='meters exponent')
    s = models.FloatField(default=0, help_text='seconds exponent')
    A = models.FloatField(default=0, help_text='ampere exponent')
    K = models.FloatField(default=0, help_text='kelvin exponent')
    cd = models.FloatField(default=0, help_text='candela exponent')
    mol = models.FloatField(default=0, help_text='mole exponent')
    multiplier = models.FloatField(
        default=0,
        help_text='multiplier in powers of 10'
    )

    constraints = [
        models.UniqueConstraint(fields=['symbol'], name='unique unit symbol')
    ]

    def get_myokit_unit(self):
        return myokit.Unit(
            exponents=[self.g, self.m, self.s,
                       self.A, self.K, self.cd, self.mol],
            multiplier=self.multiplier
        )

    def get_project(self):
        return None

    @staticmethod
    def get_unit_from_variable(v):
        unit = v.unit()
        if unit is None:
            return None
        exponents = unit.exponents()
        multiplier = unit.multiplier_log_10()
        close_enough = 1e-9
        close_enough_units = Unit.objects.filter(
            g__range=(
                exponents[0] - close_enough,
                exponents[0] + close_enough,
            ),
            m__range=(
                exponents[1] - close_enough,
                exponents[1] + close_enough,
            ),
            s__range=(
                exponents[2] - close_enough,
                exponents[2] + close_enough,
            ),
            A__range=(
                exponents[3] - close_enough,
                exponents[3] + close_enough,
            ),
            K__range=(
                exponents[4] - close_enough,
                exponents[4] + close_enough,
            ),
            cd__range=(
                exponents[5] - close_enough,
                exponents[5] + close_enough,
            ),
            mol__range=(
                exponents[6] - close_enough,
                exponents[6] + close_enough,
            ),
            multiplier__range=(
                multiplier - close_enough,
                multiplier + close_enough,
            ),
        )
        if close_enough_units.count() > 0:
            return close_enough_units[0]
        else:
            return Unit.objects.create(
                symbol=str(unit),
                g=exponents[0],
                m=exponents[1],
                s=exponents[2],
                A=exponents[3],
                K=exponents[4],
                cd=exponents[5],
                mol=exponents[6],
                multiplier=multiplier
            )

    def is_convertible_to(self, unit, compound=None):
        try:
            self.convert_to(unit, compound=compound)
        except myokit.IncompatibleUnitError:
            return False
        return True

    def convert_to(self, unit, compound=None):
        if unit is None:
            return 1.0
        if isinstance(unit, myokit.Unit):
            myokit_unit = unit
        else:
            myokit_unit = unit.get_myokit_unit()
        helpers = []
        if compound is not None:
            helpers = [f'{compound.molecular_mass} [{compound.molecular_mass_unit.symbol}]']
        return myokit.Unit.conversion_factor(
            self.get_myokit_unit(),
            myokit_unit,
            helpers=helpers,
        ).value()

    @staticmethod
    def convert_between_myokit_units(from_unit, to_unit, compound=None):
        helpers = []
        if compound is not None:
            helpers = [f'{compound.molecular_mass} [{compound.molecular_mass_unit.symbol}]']
        return myokit.Unit.conversion_factor(
            from_unit,
            to_unit,
            helpers=helpers,
        ).value()


    def get_compatible_units(self, compound=None):
        close_enough = 1e-9
        if compound is not None:
            g_is_same = Q(g__range=(
                self.g - close_enough,
                self.g + close_enough,
            ))
            mol_is_same = Q(mol__range=(
                self.mol - close_enough,
                self.mol + close_enough,
            ))
            mol_added_to_g = Q(g__range=(
                self.g + self.mol - close_enough,
                self.g + self.mol + close_enough,
            ))
            g_added_to_mol = Q(mol__range=(
                self.mol + self.g - close_enough,
                self.mol + self.g + close_enough,
            ))
            no_g = Q(g=0)
            self_has_g = self.g != 0
            self_no_g_or_mol = self.g == 0 and self.mol == 0
            no_mol = Q(mol=0)
            self_has_mol = self.mol != 0
            filter = mol_is_same & g_is_same
            mol_and_g_add_to_zero = Q(mol=1, g=-1) | Q(mol=-1, g=1)

            # take into account that '' is convertible to 'mol/g' or 'g/mol'
            if self_no_g_or_mol:
                filter |= mol_and_g_add_to_zero
            if self_has_mol:
                filter |= mol_added_to_g & no_mol
            if self_has_g:
                filter |= g_added_to_mol & no_g
            compat_units = Unit.objects.filter(
                filter,
                Q(m__range=(
                    self.m - close_enough,
                    self.m + close_enough,
                )),
                Q(s__range=(
                    self.s - close_enough,
                    self.s + close_enough,
                )),
                Q(A__range=(
                    self.A - close_enough,
                    self.A + close_enough,
                )),
                Q(K__range=(
                    self.K - close_enough,
                    self.K + close_enough,
                )),
                Q(cd__range=(
                    self.cd - close_enough,
                    self.cd + close_enough,
                )),
            )
            return compat_units
        else:
            return Unit.objects.filter(
                Q(g__range=(
                    self.g - close_enough,
                    self.g + close_enough,
                )),
                Q(mol__range=(
                    self.mol - close_enough,
                    self.mol + close_enough,
                )),
                Q(m__range=(
                    self.m - close_enough,
                    self.m + close_enough,
                )),
                Q(s__range=(
                    self.s - close_enough,
                    self.s + close_enough,
                )),
                Q(A__range=(
                    self.A - close_enough,
                    self.A + close_enough,
                )),
                Q(K__range=(
                    self.K - close_enough,
                    self.K + close_enough,
                )),
                Q(cd__range=(
                    self.cd - close_enough,
                    self.cd + close_enough,
                )),
            )


    def is_time_unit(self):
        return (
            self.s == 1 and
            self.g == 0 and self.m == 0 and self.A == 0 and
            self.K == 0 and self.cd == 0 and self.mol == 0
        )
