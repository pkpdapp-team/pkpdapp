#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.core.exceptions import ValidationError
from pkpdapp.models import MyokitModelMixin
from pkpdapp.models.tag import Tag


class MechanisticModel(models.Model, MyokitModelMixin):
    """
    A PK or PD model, represented using mmt
    """

    DEFAULT_MMT = "[[model]]\n" "\n" "[myokit]\n" "time = 0 bind time"

    DEFAULT_SBML = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<sbml "
        'xmlns="http://www.sbml.org/sbml/level3/version2/core" '
        'level="3" version="2"'
        ">"
        '<model id="default">'
        "</model>"
        "</sbml>"
    )

    name = models.CharField(max_length=100, help_text="name of the model")
    description = models.TextField(
        help_text="short description of the model", blank=True, default=""
    )
    mmt = models.TextField(
        help_text=(
            "the model represented using mmt " "(see https://myokit.readthedocs)"
        ),
        default=DEFAULT_MMT,
    )
    time_max = models.FloatField(
        default=30,
        help_text=(
            "suggested maximum time to simulate for this model (in the time "
            "units specified by the mmt model)"
        ),
    )

    is_library_model = models.BooleanField(
        default=False,
        help_text=(
            "whether this model is a library model (i.e. it is not an "
            "uploaded user model)"
        ),
    )

    # model_type field, possible model types are PK-Model, PD-Model, PK-Extravascular, or Tumor-Growth
    class ModelType(models.TextChoices):
        PK_MODEL = "PK", "PK-Model"
        PD_MODEL = "PD", "PD-Model"
        PK_EXTRAVASCULAR = "PK-E", "PK-Extravascular"
        TUMOR_GROWTH = "TG", "Tumor-Growth"

    model_type = models.CharField(
        blank=True,
        null=True,
        max_length=4,
        choices=ModelType.choices,
        help_text="type of model",
    )

    tags = models.ManyToManyField(
        Tag,
        blank=True,
        help_text="tags for the model",
    )

    class Meta:
        abstract = True

    def __str__(self):
        return str(self.name)

    def clean(self):
        try:
            self.create_myokit_model()
        except Exception as e:
            raise ValidationError({"mmt": str(e)})
