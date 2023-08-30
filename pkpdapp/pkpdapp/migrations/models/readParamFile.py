#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import openpyxl


# Load the workbook
workbook = openpyxl.load_workbook(
    'pkpdapp/migrations/models/ParametersValue_Species.xlsx', data_only=True)

sheet_names = ['1cmpt_PK_Model', '2cmpt_PK_Model',
               '3cmpt_PK_Model', '1cmpt_TMDD_Model',
               '2cmpt_TMDD_Model']
model_names = ['one_compartment', 'two_compartment',
               'three_compartment', 'one_compartment_tmdd',
               'two_compartment_tmdd']
species_list = ['M', 'R', 'K', 'H']
compound_type = ['SM', 'LM']
clinical = [False, False, False, True]

entry = ''
for sheet_name, model_name in zip(sheet_names, model_names):
    worksheet = workbook[sheet_name]

    model_entry = ''
    for row in worksheet.iter_rows():
        parameter = row[0].value
        if parameter is None:
            continue
        param_entry = ''
        for i, species in enumerate(species_list):
            species_entry = ''
            for j, ctype in enumerate(compound_type):
                rowi = i * 4 + j * 2 + 1
                value = row[rowi].value
                unit = row[rowi + 1].value
                if_clinical = clinical[i]
                species_entry += f"""{ctype}: {{
                    value: {value},
                    unit: '{unit}',
                }},"""
                if j != len(compound_type) - 1:
                    species_entry += """
                """
            param_entry += f"""{species}: {{
                {species_entry}
            }},
            """
        model_entry += f"""{parameter}: {{
            {param_entry}
        }},
        """
    entry += f"""
    {model_name}: {{
        {model_entry}
    }},"""
type = '{[key: string]: {[key: string]: {[key: string]: {[key: string]: { value: number, unit: string}}}}}'  # noqa: E501
final_entry = f"""export const param_default: {type} = {{{entry}
}};"""

# save entry to param_default.ts
with open('pkpdapp/migrations/models/param_default.ts', 'w') as f:
    f.write(final_entry)

print(final_entry)
