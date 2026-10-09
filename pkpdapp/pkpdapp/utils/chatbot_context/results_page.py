#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import Project, ResultsTable
from pkpdapp.utils.chatbot_context.shared import locale_key


# ------------
# results page
# ------------
class ResultsTableContext(BaseModel):
    name: str
    rows: str
    columns: str

    @classmethod
    def from_results_table(cls, table: ResultsTable):
        return cls(name=table.name, rows=table.rows, columns=table.columns)


class ResultsContext(BaseModel):
    tables: list[ResultsTableContext]

    @classmethod
    def from_project(cls, project: Project):
        # same tab order as the ui
        tables = sorted(
            project.results.all(), key=lambda table: locale_key(table.name)
        )
        return cls(
            tables=[ResultsTableContext.from_results_table(table) for table in tables]
        )
