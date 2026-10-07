#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import CombinedModel
from pkpdapp.utils.chatbot_context.model_pkpd import PKPDModelContext
from pkpdapp.utils.chatbot_context.model_map_variables import MapVariablesContext


# -------------------------
# model page, with its tabs
# -------------------------
class ModelContext(BaseModel):
    # corresponds to tabs under the Model page
    pkpd_model_sub_page: PKPDModelContext
    map_variables_sub_page: MapVariablesContext

    @classmethod
    def from_combined_model(cls, model: CombinedModel, *, can_edit: bool):
        return cls(
            pkpd_model_sub_page=PKPDModelContext.from_combined_model(
                model, can_edit=can_edit
            ),
            map_variables_sub_page=MapVariablesContext.from_combined_model(
                model, can_edit=can_edit
            ),
        )
