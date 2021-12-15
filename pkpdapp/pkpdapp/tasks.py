import time
from celery import shared_task

from pkpdapp.models import (
    Inference, InferenceChain, InferenceResult
)


@shared_task
def run_inference(inference):
    # create new chains
    inference.chains.set([
        InferenceChain.objects.create(
            inference=inference
        )
        for _ in range(inference.number_of_chains)
    ])

    # do the dummy inference
    value = 0.0
    for iteration in range(inference.max_number_of_iterations):
        time.sleep(5)
        for chain in inference.chains.all():
            for prior in inference.priors.all():
                InferenceResult.objects.create(
                    chain=chain,
                    prior=prior,
                    iteration=iteration,
                    value=value,
                )
                value += 11 / 7
