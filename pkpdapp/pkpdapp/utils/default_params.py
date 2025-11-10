#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import openpyxl


# Load the workbook
workbook = openpyxl.load_workbook(
    "pkpdapp/migrations/models/ParametersValue_Species.xlsx", data_only=True
)

sheet_names = [
    "1cmpt_PK_Model",
    "2cmpt_PK_Model",
    "3cmpt_PK_Model",
    "1cmpt_TMDD_Model",
    "2cmpt_TMDD_Model",
    "Ophtha",
]
model_names = [
    "one_compartment",
    "two_compartment",
    "three_compartment",
    "one_compartment_tmdd",
    "two_compartment_tmdd",
    "ophtha",
]
species_list = ["M", "R", "K", "H"]
compound_type = ["SM", "LM"]
clinical = [False, False, False, True]

defaults = {}

for sheet_name, model_name in zip(sheet_names, model_names):
    worksheet = workbook[sheet_name]

    defaults[model_name] = {}
    for row in worksheet.iter_rows():
        row_parameter = row[0].value
        if row_parameter is None:
            continue
        parameters = []
        if row_parameter == "KD or KSS":
            parameters = (
                [f"KD{i}" for i in range(1, 3)]
                + [f"KSS{i}" for i in range(1, 3)]
                + ["KD", "KSS"]
            )
        elif row_parameter == "CT1_0":
            parameters = [f"CT{i}_0" for i in range(1, 3)] + ["CT_0"]
        elif row_parameter == "koff":
            parameters = [f"koff{i}" for i in range(1, 3)] + ["koff"]
        elif row_parameter == "kint":
            parameters = [f"kint{i}" for i in range(1, 4)] + ["kint"]
        elif row_parameter == "kdeg":
            parameters = [f"kdegT{i}" for i in range(1, 3)] + ["kdegT"]
        else:
            parameters = [row_parameter]

        for parameter in parameters:
            defaults[model_name][parameter] = {}
            for i, species in enumerate(species_list):
                defaults[model_name][parameter][species] = {}
                for j, ctype in enumerate(compound_type):
                    rowi = i * 4 + j * 2 + 1
                    value = row[rowi].value
                    unit = row[rowi + 1].value
                    if_clinical = clinical[i]
                    defaults[model_name][parameter][species][ctype] = {
                        "value": value,
                        "unit": unit,
                    }
