#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Variable, BiomarkerType, Inference
)


class LogLikelihoodParameter(models.Model):

    class Name(models.TextChoices):
        SIGMA = 'SI', 'Sigma'
        STANDARD_DEVIATION = 'SD', 'Standard Deviation'

    name = models.CharField(
        max_length=2,
        choices=Name.choices,
    )

    value = models.FloatField(
        help_text='set if a fixed value for the parameter is required',
        blank=True, null=True,
    )

    log_likelihood = models.ForeignKey(
        'LogLikelihood',
        related_name='parameters',
        on_delete=models.CASCADE,
    )



class LogLikelihood(models.Model):
    """
    model class for log_likelihood functions.
    """
    variable = models.ForeignKey(
        Variable,
        related_name='log_likelihoods',
        on_delete=models.CASCADE,
    )
    inference = models.ForeignKey(
        Inference,
        related_name='log_likelihoods',
        on_delete=models.CASCADE,
    )
    biomarker_type = models.ForeignKey(
        BiomarkerType,
        on_delete=models.CASCADE,
    )

    class Form(models.TextChoices):
        NORMAL = 'N', 'Normal'
        LOGNORMAL = 'LN', 'Log-Normal'

    form = models.CharField(
        max_length=2,
        choices=Form.choices,
        default=Form.NORMAL,
    )


    def save(self, force_insert=False, force_update=False, *args, **kwargs):
        created = not self.pk

        super().save(force_insert, force_update, *args, **kwargs)

        # if created then add the necessary parameters
        if created:
            if self.form == self.Form.NORMAL:
                self.parameters.set([
                    LogLikelihoodParameter.objects.create(
                        name=LogLikelihoodParameter.Name.STANDARD_DEVIATION,
                        log_likelihood=self
                    )
                ])
            elif self.form == self.Form.LOGNORMAL:
                self.parameters.set([
                    LogLikelihoodParameter.objects.create(
                        name=LogLikelihoodParameter.Name.SIGMA,
                        log_likelihood=self
                    )
                ])
