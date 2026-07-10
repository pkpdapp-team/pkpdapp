#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import numpy as np
from django.db import models
from pkpdapp.models import StoredModel


class Distribution(StoredModel):
    """
    A probability distribution describing the inter-individual variability of a
    single model :class:`Variable`. The typical value ``P`` (mean) is supplied at
    sample time (it is the variable's value in the run), so this model only stores
    the shape (``pdf``) and the spread (``variance``) of the random effect.
    """

    class PDF(models.TextChoices):
        NORMAL = "normal", "Normal"
        LOGNORMAL = "lognormal", "Log-normal"
        LOGIT = "logit", "Logit-normal"

    variable = models.OneToOneField(
        "Variable",
        on_delete=models.CASCADE,
        related_name="distribution",
        help_text="variable this distribution applies to",
    )
    pdf = models.CharField(
        max_length=10,
        choices=PDF.choices,
        default=PDF.NORMAL,
        help_text="probability density function",
    )
    variance = models.FloatField(
        default=0.0,
        help_text="variance of the ETA (normal random effect)",
    )

    def validate(self, mean):
        """Check the typical value ``mean`` (P) is valid for this pdf.

        Raises ``ValueError`` on a domain violation. Callers must run this before
        sampling; :meth:`sample` assumes the distribution is already valid.
          - variance must be non-negative
          - lognormal requires mean > 0
          - logit requires 0 < mean < 1
        """
        if self.variance < 0:
            raise ValueError("distribution variance must be non-negative")
        if self.pdf == self.PDF.LOGNORMAL and mean <= 0:
            raise ValueError("log-normal distribution requires mean > 0")
        if self.pdf == self.PDF.LOGIT and not (0 < mean < 1):
            raise ValueError("logit-normal distribution requires 0 < mean < 1")

    def sample(self, mean, rng):
        """Draw one sample given the typical value ``mean`` (P) and an RNG.

        Pure pdf math; assumes the distribution has already been validated (see
        :meth:`validate`). ``ETA ~ N(0, variance)``.
          - normal:    Pi ~ N(mean, variance)
          - lognormal: Pi = mean * exp(ETA)
          - logit:     Pi = e*mean / (e*mean - mean + 1), where e = exp(ETA)
        """
        std = float(np.sqrt(self.variance))
        if self.pdf == self.PDF.LOGNORMAL:
            return float(mean * np.exp(rng.normal(0.0, std)))
        if self.pdf == self.PDF.LOGIT:
            e = np.exp(rng.normal(0.0, std)) * mean
            return float(e / (e - mean + 1.0))
        return float(rng.normal(mean, std))
