#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from celery import shared_task

from pkpdapp.models import (
    Inference, InferenceMixin
)


@shared_task
def run_inference(inference_id):
    inference = Inference.objects.get(id=inference_id)

    # create the mixin object to run the inference
    inference_mixin = InferenceMixin(inference)
    inference_mixin.run_inference()

    # remove task id to indicate that we're finished
    inference.task_id = None
    inference.save()
