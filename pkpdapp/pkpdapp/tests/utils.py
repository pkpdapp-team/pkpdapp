#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pkpdapp.models import (
    Inference, PharmacodynamicModel,
    CombinedModel,
    Unit,
    LogLikelihood,
    Project, BiomarkerType, Biomarker,
    Algorithm,
    Dataset,
    Subject,
    Compound,
)


def create_pd_inference(sampling=False):
    compound = Compound.objects.create(name="demo")
    project = Project.objects.create(name="demo", compound=compound)
    pd = PharmacodynamicModel.objects.get(
        name='tumour_growth_gompertz',
        read_only=False,
    )
    model = CombinedModel.objects.create(
        name='my wonderful model',
        pd_model=pd,
    )
    # generate some fake data
    output = model.variables.get(qname='PDCompartment.TS')
    time = model.variables.get(qname='environment.t')
    data = model.simulate(outputs=[output.qname, time.qname])[0]
    print(data)
    TS = data[output.id]
    times = data[time.id]
    dataset = Dataset.objects.create(
        name='fake data',
        project=project,
    )
    bt = BiomarkerType.objects.create(
        name='fake data',
        dataset=dataset,
        stored_unit=Unit.objects.get(symbol='mL'),
        display_unit=Unit.objects.get(symbol='mL'),
        stored_time_unit=Unit.objects.get(symbol='day'),
        display_time_unit=Unit.objects.get(symbol='day'),
    )
    subject1 = Subject.objects.create(
        id_in_dataset=1,
        dataset=dataset,
    )
    subject2 = Subject.objects.create(
        id_in_dataset=2,
        dataset=dataset,
    )

    for i, (t, ts) in enumerate(zip(times, TS)):
        Biomarker.objects.create(
            biomarker_type=bt,
            time=t,
            value=ts,
            subject=subject1,
        )
        Biomarker.objects.create(
            biomarker_type=bt,
            time=t,
            value=ts,
            subject=subject2,
        )

    bt_covariate = BiomarkerType.objects.create(
        name='fake body weight',
        dataset=dataset,
        stored_unit=Unit.objects.get(symbol='kg'),
        display_unit=Unit.objects.get(symbol='kg'),
        stored_time_unit=Unit.objects.get(symbol='day'),
        display_time_unit=Unit.objects.get(symbol='day'),
    )

    for s in [subject1, subject2]:
        Biomarker.objects.create(
            biomarker_type=bt_covariate,
            time=0,
            value=20,
            subject=s,
        )

    algorithm = Algorithm.objects.get(
        name='Haario-Bardenet') if sampling \
        else Algorithm.objects.get(name='XNES')
    inference = Inference.objects.create(
        name='bob',
        project=project,
        max_number_of_iterations=10,
        algorithm=algorithm,
        number_of_chains=3,
    )

    log_likelihood = LogLikelihood.objects.create(
        variable=model.variables.first(),
        inference=inference,
        form=LogLikelihood.Form.MODEL
    )

    # remove all outputs except
    output_names = [
        'PDCompartment.TS',
    ]
    outputs = []
    for output in log_likelihood.outputs.all():
        if output.variable.qname in output_names:
            output.parent.biomarker_type = bt
            output.parent.observed = True
            output.parent.save()
            outputs.append(output.parent)
        else:
            for param in output.parent.parameters.all():
                if param != output:
                    param.child.delete()
            output.parent.delete()

    return inference, log_likelihood, bt, bt_covariate, model, dataset
