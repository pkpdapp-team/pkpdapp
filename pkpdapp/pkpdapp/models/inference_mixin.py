#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import pints
import numpy as np
from pkpdapp.models import MyokitForwardModel


class CombinedLogLikelihood(pints.LogPDF):
    """
    Creates a `PINTS.LogLikelihood` object from a list of individual
    `PINTS.LogLikelihood` objects. It is assumed that each individual
    log_likelihood has a single noise parameter.
    """
    def __init__(self, *log_likelihoods):
        self._log_likelihoods = [ll for ll in log_likelihoods]
        self._n_outputs = len(self._log_likelihoods)

        self._n_myokit_parameters = self._log_likelihoods[0].n_parameters() - 1

        # assumes each log-likelihood has one noise parameter
        self._n_parameters = self._n_myokit_parameters + self._n_outputs

    def __call__(self, x):
        # assumes noise parameters are at end of parameter list
        noise_parameters = x[-self._n_outputs:]
        myokit_parameters = x[:self._n_myokit_parameters]

        # create subsets for each likelihood and call each
        log_like = 0
        k = 0
        for ll in self._log_likelihoods:
            log_like += ll(myokit_parameters + [x[k]])
            k += 1
        return log_like

    def n_parameters(self):
        return self._n_parameters
