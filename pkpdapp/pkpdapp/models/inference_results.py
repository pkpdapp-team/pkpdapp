#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Inference,
    Prior,
    LogLikelihood,
)
import pandas as pd


class InferenceChain(models.Model):
    inference = models.ForeignKey(
        Inference,
        on_delete=models.CASCADE,
        related_name='chains',
        help_text='inference for this chain'
    )

    def as_pandas(self):
        priors_values = \
            self.inference_results.order_by('iteration').values_list(
                'prior', 'value', 'iteration'
            )
        if priors_values:
            priors, values, iterations = list(zip(*priors_values))
        else:
            priors = []
            values = []
            iterations = []
        df = pd.DataFrame.from_dict({
            'priors': priors,
            'values': values,
            'iterations': iterations,
        })

        return df


class InferenceResult(models.Model):
    """
    Abstract class for inference results.
    """
    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        related_name='inference_results',
        help_text='Chain related to the row'
    )
    prior = models.ForeignKey(
        Prior,
        on_delete=models.CASCADE,
        related_name='inference_results',
        help_text='prior/variable for this value'
    )
    iteration = models.IntegerField(
        help_text='Iteration'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )


class InferenceFunctionResult(models.Model):
    """
    model for logLikelihood evaluations during inference.
    """
    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        related_name='inference_function_results',
        help_text='Chain related to the row'
    )
    iteration = models.IntegerField(
        help_text='Iteration'
    )
    value = models.FloatField(
        help_text='estimated parameter value'
    )

class InferenceOutputResult(models.Model):
    """
    model for output values for a given logLikelihood.
    """
    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        related_name='inference_output_results',
        help_text='Chain related to the output result'
    )
    value = models.FloatField(
        help_text=(
            'if value_max is null, then this is the value of the output. '
            'if value_max is not null, then this is the minimum value of output (for a range)'
        )
    )
    data = models.FloatField(
        help_text=(
            'data value for comparison'
        )
    )
    value_max = models.FloatField(
        blank=True, null=True,
        help_text='maximum value of output (for a range)'
    )
    time = models.FloatField(
        help_text='time of output value'
    )
