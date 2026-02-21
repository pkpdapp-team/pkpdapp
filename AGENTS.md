# AGENTS

PKPDApp is an open-source web application for exploring, analyzing, and modeling the pharmacokinetics (PK) and pharmacodynamics (PD) of chemical compounds.

## Backend 

Django 3.2.25 with Django REST Framework

single application in `pkpdapp/pkpdapp` folder

### Usage

use virtualenv in `env` folder

```bash
python3 -m venv env
source env/bin/activate
```

run migrations if needed

```bash
cd pkpdapp
python manage.py migrate
```

run the development server

```bash
python manage.py runserver
```

### tests

```bash
cd pkpdapp
python manage.py test
```

### REST API schema

To generate the OpenAPI specification, run the following command:

```bash
python manage.py spectacular --color --file schema.yml
```

### features:

- full Pkpd models are defined by CombinedModel model in `pkpdapp/pkpdapp/models/combined_model.py`, made up of the following components:
  - `pkpdapp/pkpdapp/models/mechanistic_model.py` - based abstract model, references a Myokit mmt file, which are all stored in `pkpdapp/pkpdapp/migrations/models-v3/*`
  - `pkpdapp/pkpdapp/models/pharmacodynamic_model.py` - pharmacodynamic model
  - `pkpdapp/pkpdapp/models/pharmacokinetic_model.py` - pharmacokinetic model
  - CombinedModel is constructed by referencing the above models in `pk_model`, `pk_model2`, `pk_effect_model`, `pd_model`, `pd_model2` fields.
  - the CombinedModel.create_myokit_model() method creates a Myokit model from the above components, which is then used for simulation and analysis.
  - whenever a CombinedModel is saved, the MyokitModelMixin.update() method (in `pkpdapp/pkpdapp/models/myokit_model_mixin.py`) is called, which:
    - creates a Myokit model using the create_myokit_model() method
    - creates Variable models (`pkpdapp/pkpdapp/models/variable.py`) for each variable in the Myokit model. changes in the model can result in variables being deleted or added.
- A Variable model has a Unit model (`pkpdapp/pkpdapp/models/unit.py`) which defines the unit of the variable. The myokit mmt file for each model component defines the units that are used internally to simulate the model, but the unit field on the Variable model defines what unit the variable is displayed in on the frontend. 
- A Variable in a model can be dosed using the Protocol model (`pkpdapp/pkpdapp/models/protocol.py`), which defines the dosing schedule for a variable using the Dose model (`pkpdapp/pkpdapp/models/dose.py`).
- Data measurements/observations of a Variable can be stored using the BiomarkerType model(`pkpdapp/pkpdapp/models/biomarker_type.py`) and individual measurements in the Biomarker model (`pkpdapp/pkpdapp/models/biomarker.py`)
- A REST api of these models is provided using Django REST Framework, with serializers defined in `pkpdapp/pkpdapp/api/serializers/*` and views in `pkpdapp/pkpdapp/api/views/*`. The api is used by the frontend to create, read, update, and delete models and their components, as well as to run simulations and analyses.
- the main function for simulating a CombinedModel is defined in MyokitModelMixin.simulate()
- project management is handled by the Project model in `pkpdapp/pkpdapp/models/project.py`, which allows users to create and manage projects. each project has a single CombinedModel, and a single Compound model (`pkpdapp/pkpdapp/models/compound.py`), which defines the chemical compound being modeled and defines the molecular weight for unit conversions. 
- simulations are defined by the Simulation model in `pkpdapp/pkpdapp/models/simulation.py`. Each simulation has zero or more SimulationPlot models, each simulation plot has one or more SimulationYAxis models, which define the variables to plot on the y axis, and SimulationCxLine models which define reference lines. Each simulation has zero or more SimulationSlider models, which define parameters that can be varied in the simulation and displayed as sliders on the frontend.


## Frontend 

React 19 with Typescript

### Usage

```bash
cd frontend-v2
yarn install
yarn start
```

### tests

uses storybook

```bash
cd frontend-v2
yarn test
```

### Generating API client

Thee front-end uses the Redux Toolkit RTX Query tool to automatically generate a
client for the api based on the OpenAPI spec described above. To generate the
client, run the following command in the frontend directory:

```bash
npx @rtk-query/codegen-openapi openapi-config.json
```

This creates the `frontend-v2/src/app/backendApi.ts` file which contains the generated client. The dependencies between endpoints are defined in `frontend-v2/src/app/api.ts`

### features:

- project management tab in `frontend-v2/src/features/projects` allows users to create and manage projects (Project model in backend)
- compound/drug management tab in `frontend-v2/src/features/drugs` allows users to create and manage compounds (Compound model in backend) and add/edit EfficacyExperiment models
- model management tab in `frontend-v2/src/features/model` allows users to create and modify a CombinedModel, this tab has a number of sub-tabs:
  - model tab in `frontend-v2/src/features/model/model` allows users to select the base pk model, extravascular pk model2, number of effect compartments pk_effect_model, base pd model, and additional pd model2.
  - variables tab in `frontend-v2/src/features/model/variables` allows users to specify which variable to dose into, and to choose a pk variable to link to the pd model effect variable. User can mark variables as being used in the secondary parameters tab (see below)
  - parameters tab in `frontend-v2/src/features/model/parameters` allows users to view and edit the parameters (all constant variables) in the model
  - secondary parameters tab in `frontend-v2/src/features/model/secondary`, allows users to specify time period and thresholds to use for secondary parameters. For all secondary parameters, summary statistics are calculated over the time period and using the provided thresholds and displayed in the results tab (see below)
- data management tab in `frontend-v2/src/features/data` allows users to upload a csv file containing observations of a variable, and dosing events. There is a stepper interface to guide users through the process of mapping columns in the csv file to internal column types (time, observations, dose amounts, units etc).
- Trial design tab in `frontend-v2/src/features/trial` allows users to specify dosing events. This tab has multiple "group" tabs which are either simulation groups (when a user chooses a variable to dose into via the model tab, a new simulation group is created for that variable) or data groups (when a user uploads a csv file, a new data group is created for each dosing group identified in the csv file). Within each group tab, users can specify dosing events and amounts
- Simulations tab in `frontend-v2/src/features/simulation` edit the Simulation and associated models in the backend. In this tab a user can see the results of the simulation, and adjust sliders to see how the results change. The simulation is re-run each time a slider is adjusted, and the results are updated
- Results tab in `frontend-v2/src/features/results` shows tables of the secondary parameters calculated over the specified time period and thresholds