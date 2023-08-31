
#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.apps import apps

from pkpdapp.models import (
    Project
)
from pkpdapp.utils import (
    MonolixModelParser,
    MonolixProjectParser,
    DataParser
)


def monolix_import(
    app_project: Project, project_str: str,
    model_str: str, data_str: str, validate: bool = True
):
    """
    Import a Monolix project into the database.

    Parameters
    ----------
    project
      project file as a string
    model
      model file as a string
    data
      data file as a string
    """

    # parse the project file
    project_parser = MonolixProjectParser()
    project = project_parser.parse(project_str)

    # parse the model file
    model_parser = MonolixModelParser()
    model, (admin_id, dosed_compartment, tlag,
            direct, dosed_qname) = model_parser.parse(model_str)

    # parse the data file
    data_parser = DataParser()
    delimiter = project['<DATAFILE>']['[FILEINFO]']['delimiter']
    if delimiter == 'tab':
        delimiter = '\t'
    data = data_parser.parse_from_str(data_str, delimiter=delimiter)

    if validate:
        return

    # set the parameters of the myokit model to match the typical population
    # parameters
    for parameter_name, parameter in project[
        '<MODEL>'
    ]['[INDIVIDUAL]']['DEFINITION:'].items():
        typical_str = parameter['typical']
        try:
            typical_value = float(typical_str)
        except ValueError:
            # must refer to a population parameter
            population_parameter = project['<PARAMETER>'][typical_str]
            typical_value = population_parameter['value']
        var = model.var('root.{}'.format(parameter_name))
        var.set_rhs(typical_value)

    # create the pd model
    PharmacodynamicModel = apps.get_model('pkpdapp', 'PharmacodynamicModel')
    pd_model = PharmacodynamicModel.objects.create(
        name=project['<MODEL>']['[LONGITUDINAL]']['file'],
        project=app_project,
        mmt=model.code(),
    )

    # create the dataset
    Dataset = apps.get_model('pkpdapp', 'Dataset')
    dataset = Dataset.objects.create(
        name=project['<DATAFILE>']['[FILEINFO]']['file'],
        project=app_project,
    )

    # only display the fitted output of dataset
    for bt in dataset.biomarker_types.all():
        if bt.name == project['<FIT>']['data']:
            bt.display = True
        else:
            bt.display = False
        bt.save()

    if direct:
        data.assign(ROUTE='IV')
    else:
        data.assign(ROUTE='Extravascular')

    dataset.replace_data(data)

    # get the right protocol
    # (TODO: we cheat and only get the one for the first subject)
    protocol = dataset.subjects.first().protocol

    # create the pk model
    CombinedModel = apps.get_model(
        'pkpdapp', 'CombinedModel')
    pk_model = CombinedModel.objects.create(
        name='Dosed {}'.format(project['<MODEL>']['[LONGITUDINAL]']['file']),
        project=app_project,
        pd_model=pd_model,
        pk_model=None,
    )

    drug = pk_model.variables.get(qname=dosed_qname)
    drug.protocol = protocol
    drug.save()

    # only display the fitted output of model
    fit_variable = project['<FIT>']['model']
    model_variable = project[
        '<MODEL>'
    ][
        '[LONGITUDINAL]'
    ][
        'DEFINITION:'
    ][fit_variable]['prediction']
    for model in [pd_model, pk_model]:
        for var in model.variables.filter(constant=False):
            var.display = var.name == model_variable
            var.save()

    return pd_model, pk_model, dataset
