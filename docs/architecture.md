# PKPDApp Architecture

PKPDApp is an open-source web application for exploring, analyzing, and modeling the pharmacokinetics (PK) and pharmacodynamics (PD) of chemical compounds.

## Tech Stack

- **Backend:** Django 3.2.25 with Django REST Framework
- **Frontend:** React 19 with TypeScript
- **Build Tool:** Vite
- **State Management:** Redux Toolkit with RTK Query
- **Testing:** Storybook and Vitest (frontend), Django Test Framework (backend)

## Backend Architecture

### Application Structure

Single Django application located in `pkpdapp/pkpdapp` folder.

### Core Models

#### PKPD Model System

Full PKPD models are defined by the `CombinedModel` ([pkpdapp/pkpdapp/models/combined_model.py](pkpdapp/pkpdapp/models/combined_model.py)), which is composed of several model components:

- **MechanisticModel** ([pkpdapp/pkpdapp/models/mechanistic_model.py](pkpdapp/pkpdapp/models/mechanistic_model.py)) - Base abstract model that references Myokit `.mmt` files stored in `pkpdapp/pkpdapp/migrations/models-v3/*`
- **PharmacodynamicModel** ([pkpdapp/pkpdapp/models/pharmacodynamic_model.py](pkpdapp/pkpdapp/models/pharmacodynamic_model.py)) - PD component
- **PharmacokineticModel** ([pkpdapp/pkpdapp/models/pharmacokinetic_model.py](pkpdapp/pkpdapp/models/pharmacokinetic_model.py)) - PK component

The `CombinedModel` references these components through the following fields:
- `pk_model` - Primary pharmacokinetic model
- `pk_model2` - Secondary/extravascular PK model
- `pk_effect_model` - Effect compartment model
- `pd_model` - Primary pharmacodynamic model
- `pd_model2` - Secondary PD model

#### Model Compilation and Variables

When a `CombinedModel` is saved:

1. `CombinedModel.create_myokit_model()` creates a Myokit model from the components
2. `MyokitModelMixin.update()` ([pkpdapp/pkpdapp/models/myokit_model_mixin.py](pkpdapp/pkpdapp/models/myokit_model_mixin.py)) is called to:
   - Create a Myokit model using `create_myokit_model()`
   - Create/update `Variable` models ([pkpdapp/pkpdapp/models/variable.py](pkpdapp/pkpdapp/models/variable.py)) for each variable in the Myokit model

#### Units System

- Each `Variable` has a `Unit` model ([pkpdapp/pkpdapp/models/unit.py](pkpdapp/pkpdapp/models/unit.py))
- Myokit `.mmt` files define internal simulation units
- The `Unit` field on `Variable` defines the display unit on the frontend
- Pre-defined units are in migrations:
  - [pkpdapp/pkpdapp/migrations/0007_initial_units.py](pkpdapp/pkpdapp/migrations/0007_initial_units.py)
  - [pkpdapp/pkpdapp/migrations/0051_new_units.py](pkpdapp/pkpdapp/migrations/0051_new_units.py)

#### Dosing and Data

- **Protocol** ([pkpdapp/pkpdapp/models/protocol.py](pkpdapp/pkpdapp/models/protocol.py)) - Defines dosing schedules for variables
- **Dose** ([pkpdapp/pkpdapp/models/dose.py](pkpdapp/pkpdapp/models/dose.py)) - Individual dose events
- **BiomarkerType** ([pkpdapp/pkpdapp/models/biomarker_type.py](pkpdapp/pkpdapp/models/biomarker_type.py)) - Defines types of measurements for variables
- **Biomarker** ([pkpdapp/pkpdapp/models/biomarker.py](pkpdapp/pkpdapp/models/biomarker.py)) - Individual measurement observations

#### Project Management

- **Project** ([pkpdapp/pkpdapp/models/project.py](pkpdapp/pkpdapp/models/project.py)) - Container for user projects
  - Each project has one `CombinedModel`
  - Each project has one `Compound` ([pkpdapp/pkpdapp/models/compound.py](pkpdapp/pkpdapp/models/compound.py)) that defines the chemical compound and molecular weight for unit conversions

#### Simulations

- **Simulation** ([pkpdapp/pkpdapp/models/simulation.py](pkpdapp/pkpdapp/models/simulation.py)) - Defines a simulation configuration
  - **SimulationPlot** - Visualization configuration for simulation results
  - **SimulationYAxis** - Variables to plot on Y-axis
  - **SimulationCxLine** - Reference lines on plots
  - **SimulationSlider** - Interactive parameters that can be adjusted in the UI

#### REST API

- Serializers: `pkpdapp/pkpdapp/api/serializers/*`
- Views: `pkpdapp/pkpdapp/api/views/*`
- The API enables CRUD operations for all models and supports simulation execution

### Useful Backend Methods

- **`MyokitModelMixin.simulate()`** - Main simulation function for CombinedModel, used by the frontend to run simulations.
- **`MyokitModelMixin.update_model()`** - Run on every save of a CombinedModel (if needed) to update the variables based on the Myokit model
- **`CombinedModel.create_myokit_model()`** - Assembles component models into a complete Myokit model

## Frontend Architecture

### Application Structure

React application located in `frontend-v2/`

### State Management

- **Redux Toolkit** for state management
- **RTK Query** for API client generation
  - Generated client: [frontend-v2/src/app/backendApi.ts](frontend-v2/src/app/backendApi.ts)
  - Endpoint dependencies: [frontend-v2/src/app/api.ts](frontend-v2/src/app/api.ts)

**Regenerating the API client:**

1. Generate the OpenAPI schema from the backend:
```bash
cd pkpdapp
python manage.py spectacular --color --file schema.yml
```

2. Generate the RTK Query client from the schema:
```bash
cd frontend-v2
npx @rtk-query/codegen-openapi openapi-config.json
```

### Feature Modules

#### Projects ([frontend-v2/src/features/projects](frontend-v2/src/features/projects))
- Create and manage projects
- Maps to `Project` model in backend

#### Drugs/Compounds ([frontend-v2/src/features/drugs](frontend-v2/src/features/drugs))
- Create and manage compounds
- Add/edit EfficacyExperiment models
- Maps to `Compound` model in backend

#### Model Management ([frontend-v2/src/features/model](frontend-v2/src/features/model))
Multi-tab interface for creating and modifying `CombinedModel`:

- **Model Tab** ([frontend-v2/src/features/model/model](frontend-v2/src/features/model/model))
  - Select base PK model
  - Choose extravascular PK model (pk_model2)
  - Configure effect compartments (pk_effect_model)
  - Select base PD model
  - Choose additional PD model (pd_model2)

- **Variables Tab** ([frontend-v2/src/features/model/variables](frontend-v2/src/features/model/variables))
  - Specify which variable to dose into
  - Link PK variables to PD model effect variables
  - Mark variables for use in secondary parameters

- **Parameters Tab** ([frontend-v2/src/features/model/parameters](frontend-v2/src/features/model/parameters))
  - View and edit all constant variables (parameters) in the model

- **Secondary Parameters Tab** ([frontend-v2/src/features/model/secondary](frontend-v2/src/features/model/secondary))
  - Specify time periods and thresholds for secondary parameter calculations
  - Summary statistics are calculated and displayed in the Results tab

#### Data Management ([frontend-v2/src/features/data](frontend-v2/src/features/data))
- Upload CSV files with observations and dosing events
- Stepper interface for mapping CSV columns to internal types:
  - Time columns
  - Observation values
  - Dose amounts
  - Units
  - etc.

#### Trial Design ([frontend-v2/src/features/trial](frontend-v2/src/features/trial))
- Specify dosing events through a tabbed interface
- **Simulation Groups** - Created when user selects a variable to dose into
- **Data Groups** - Created for each dosing group identified in uploaded CSV files
- Configure dose amounts and schedules within each group

#### Simulations ([frontend-v2/src/features/simulation](frontend-v2/src/features/simulation))
- Edit `Simulation` and associated models
- View simulation results
- Interactive sliders to adjust parameters
- Real-time simulation updates when sliders are adjusted

#### Results ([frontend-v2/src/features/results](frontend-v2/src/features/results))
- Display tables of secondary parameters
- Shows calculated values over specified time periods and thresholds