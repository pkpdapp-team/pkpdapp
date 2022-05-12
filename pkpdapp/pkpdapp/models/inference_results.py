#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Inference,
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

    def outputs_for(self, log_likelihood):
        data = \
            self.inference_output_results.filter(
                log_likelihood=log_likelihood
            ).order_by('time').values_list(
                'median', 'percentile_min', 'percentile_max', 'data', 'time'
            )
        if data:
            (
                medians,
                percentile_mins,
                percentile_maxs,
                datas,
                times
            ) = list(zip(*data))
        else:
            medians = []
            percentile_mins = []
            percentile_maxs = []
            datas = []
            times = []

        df = pd.DataFrame.from_dict({
            'medians': medians,
            'percentile_mins': percentile_mins,
            'percentile_maxs': percentile_maxs,
            'datas': datas,
            'times': times,
        })

        return df

    def as_pandas(self):
        priors_values = \
            self.inference_results.filter(
                iteration__gt=self.inference.burn_in
            ).order_by('iteration').values_list(
                'log_likelihood', 'value', 'iteration'
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

    def function_as_pandas(self):
        iteration_values = \
            self.inference_function_results.filter(
                iteration__gt=self.inference.burn_in
            ).order_by('iteration').values_list(
                'value', 'iteration'
            )
        if iteration_values:
            values, iterations = list(zip(*iteration_values))
        else:
            values = []
            iterations = []
        df = pd.DataFrame.from_dict({
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
    log_likelihood = models.ForeignKey(
        LogLikelihood,
        on_delete=models.CASCADE,
        related_name='inference_results',
        help_text='log_likelihood related to this result'
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
    log_likelihood = models.ForeignKey(
        LogLikelihood,
        on_delete=models.CASCADE,
        related_name='inference_output_results',
        help_text='log_likelihood related to the output result'
    )

    chain = models.ForeignKey(
        InferenceChain,
        on_delete=models.CASCADE,
        related_name='inference_output_results',
        help_text='Chain related to the output result'
    )

    median = models.FloatField(
        help_text='median of output distribution'
    )

    percentile_min = models.FloatField(
        blank=True, null=True,
        help_text='10th percentile of output distribution'
    )

    percentile_max = models.FloatField(
        blank=True, null=True,
        help_text='90th percentile of output distribution'
    )

    data = models.FloatField(
        help_text=(
            'data value for comparison'
        )
    )
    time = models.FloatField(
        help_text='time of output value'
    )
