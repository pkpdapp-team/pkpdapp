#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel


# --------------
# shared helpers
# --------------
def round_sig(value: float):
    # 6 significant figures, like the ui
    return float(f"{value:.6g}")


def locale_key(text: str):
    # approximates js localeCompare: case-insensitive first, lowercase first on ties
    return (text.casefold(), text.swapcase())


class SelectionContext(BaseModel):
    selected: bool
    enabled: bool
