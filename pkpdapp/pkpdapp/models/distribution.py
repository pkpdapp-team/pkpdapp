#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import numpy as np
from django.core.validators import MaxValueValidator, MinValueValidator
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
    correlations = models.ManyToManyField(
        "self",
        through="Correlation",
        symmetrical=False,
        help_text="other distributions this one is correlated with",
    )

    def get_correlations(self):
        """Return every :class:`Correlation` this distribution takes part in.

        Correlation rows are stored once per unordered pair (see
        :meth:`Correlation.save`), so a distribution may sit on either side. This
        queries both, unlike the ``correlations`` accessor which only follows the
        ``distribution_1`` side.
        """
        return Correlation.objects.filter(
            models.Q(distribution_1=self) | models.Q(distribution_2=self)
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

    def apply(self, mean, eta):
        """Transform a random effect ``eta`` into a parameter value ``Pi``.

        Pure pdf math; assumes the distribution has already been validated (see
        :meth:`validate`) and that ``eta`` is a draw from ``N(0, variance)``. Kept
        separate from drawing ``eta`` so a correlated population can draw the whole
        ETA vector jointly (see the uncertainty simulation mixin) and then apply
        each parameter's transform here.
          - normal:    Pi = mean + ETA
          - lognormal: Pi = mean * exp(ETA)
          - logit:     Pi = e*mean / (e*mean - mean + 1), where e = exp(ETA)
        """
        if self.pdf == self.PDF.LOGNORMAL:
            return float(mean * np.exp(eta))
        if self.pdf == self.PDF.LOGIT:
            e = np.exp(eta) * mean
            return float(e / (e - mean + 1.0))
        return float(mean + eta)

    def sample(self, mean, rng):
        """Draw one independent sample given the typical value ``mean`` (P).

        Convenience for the uncorrelated case: draws ``ETA ~ N(0, variance)`` and
        applies the pdf transform (see :meth:`apply`).
        """
        std = float(np.sqrt(self.variance))
        return self.apply(mean, rng.normal(0.0, std))


class Correlation(StoredModel):
    """
    An off-diagonal element of the population covariance matrix: the correlation
    between the random effects (ETAs) of two :class:`Distribution`\\ s. The matrix
    is symmetric, so each unordered pair is stored once (see :meth:`save`), and any
    pair without a row is treated as uncorrelated (coefficient 0).
    """

    distribution_1 = models.ForeignKey(
        Distribution,
        on_delete=models.CASCADE,
        related_name="correlations_as_1",
        help_text="first distribution of the correlated pair",
    )
    distribution_2 = models.ForeignKey(
        Distribution,
        on_delete=models.CASCADE,
        related_name="correlations_as_2",
        help_text="second distribution of the correlated pair",
    )
    coefficient = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(-1.0), MaxValueValidator(1.0)],
        help_text="Pearson correlation coefficient of the ETAs, in [-1, 1]",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["distribution_1", "distribution_2"],
                name="unique_correlation_pair",
            ),
        ]

    def get_project(self):
        """Return the project this correlation belongs to (via its variables)."""
        return self.distribution_1.variable.get_project()

    def save(self, *args, **kwargs):
        # store each unordered pair once, with the lower id first, so lookups
        # don't have to try both orderings and the unique constraint holds
        if (
            self.distribution_1_id
            and self.distribution_2_id
            and self.distribution_1_id > self.distribution_2_id
        ):
            self.distribution_1_id, self.distribution_2_id = (
                self.distribution_2_id,
                self.distribution_1_id,
            )
        super().save(*args, **kwargs)
