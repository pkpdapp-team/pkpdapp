import pandas as pd


 
class MonolixDataParser:
  ID = ["ID"]
  TIME= ["Time"]
  TIME_UNIT= ["Time_unit", "Time_units"]
  AMOUNT = ["Amt"]
  AMOUNT_UNIT = ["Amt_unit", "Amt_units"]
  OBSERVATION = ["DV", "Observation", "Y"]
  OBSERVATION_NAME = ["Observation_id", "YTYPE"]
  OBSERVATION_UNIT = ["Observation_unit", "YDESC"]
  DOSE_UNIT = ["Dose_units"]
  DOSE = ["Dose"]
  DOSE_UNIT = ["Dose_units"]
  DOSE_GROUP = ["Dose_cat"]

  required_cols = {
    "ID": ID,
    "TIME": TIME,
    "TIME_UNIT": TIME_UNIT,
    "AMOUNT": AMOUNT,
    "AMOUNT_UNIT": AMOUNT_UNIT,
    "OBSERVATION": OBSERVATION,
    "OBSERVATION_NAME": OBSERVATION_NAME,
    "OBSERVATION_UNIT": OBSERVATION_UNIT,
    "DOSE_UNIT": DOSE_UNIT,
    "DOSE": DOSE,
    "DOSE_UNIT": DOSE_UNIT,
    "DOSE_GROUP": DOSE_GROUP,
  }

  def __init__(self):
    pass

  def validate(self, data):
    colnames = list(data.columns)

    # check that all required columns are present
    error_cols = []
    found_cols = {}
    for col_name, col_alts in self.required_cols:
        found = False
        for alternate_name in col_alts:
            if alternate_name in colnames:
                found_cols[col_name] = alternate_name
                found = True
                break
        if not found:
            error_cols.append(col_name)
    
    if len(error_cols) > 0:
        raise RuntimeError(
            (
                'Error parsing file, '
                'does not have the following columns: {}'
            ).format(error_cols)
        )

    # check that time unit is only h or d
    time_units = data['TIME_UNIT'].unique().tolist()

    pkpdapp_units = Unit.objects.all()
    pkpdapp_time_units = pkpdapp_units.filter(
        id__in=[u.id for u in pkpdapp_units if u.is_time_unit()]
    )
    pkpdapp_time_units_symbols = \
        pkpdapp_time_units.values_list('symbol', flat=True)

    error_tunits = [
        tu for tu in time_units
        if tu not in pkpdapp_time_units_symbols
    ]
    if len(error_tunits) > 0:
        raise serializers.ValidationError(
            (
                'Error parsing file, '
                'contains the following unknown time units: {}'
            ).format(error_tunits)
        )

    # check whether biomarker units are in list of standard units
    bio_units = data['UNIT'].unique().tolist()
    pkpdapp_units_symbols = \
        pkpdapp_units.values_list('symbol', flat=True)
    error_bunits = [
        u for u in bio_units
        if u not in pkpdapp_units_symbols
    ]
    if len(error_bunits) > 0:
        raise serializers.ValidationError(
            (
                'Error parsing file, '
                'contains the following unknown units: {}'
            ).format(error_bunits)
        )

    # check for missing data and drop any rows where data are missing
    num_missing = data.isna().sum().sum()
    if num_missing > 0:
        data = data.fillna('')
    return data



  def parse(self, data_str):
    data = pd.read_csv(data_str)
    
