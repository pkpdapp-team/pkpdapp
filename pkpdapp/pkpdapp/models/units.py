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
        max_length=10, help_text='symbol for unit display'
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
