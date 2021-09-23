#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
import myokit


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
    multiplier = models.FloatField(default=0, help_text='multiplier')

    constraints = [
        models.UniqueConstraint(fields=['symbol'], name='unique unit symbol')
    ]

    def get_myokit_unit(self):
        return myokit.Unit(
            exponents=[self.g, self.m, self.s,
                       self.A, self.K, self.cd, self.mol],
            multiplier=self.multiplier
        )

    @staticmethod
    def get_unit_from_variable(v):
        unit = v.unit()
        exponents = unit.exponents()
        multiplier = unit.multiplier()
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

    def is_time_unit(self):
        return (
            self.s == 1 and
            self.g == 0 and self.m == 0 and self.A == 0 and
            self.K == 0 and self.cd == 0 and self.mol == 0
        )
