#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import django
import codecs
from django.utils import timezone
import urllib.request
from django.test import TestCase
from pkpdapp.models import Dataset, Dose, Biomarker
from pkpdapp.utils import DataParser

django.setup()
BASE_URL_DATASETS = "https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/"  # noqa: E501


class TestDataParser(TestCase):
    def test_per_body_weight_boolean_parsing(self):
        # The per body weight flag should accept common truthy representations
        # case-insensitively, including the uppercase TRUE/FALSE that Excel
        # exports produce.
        raw_values = [
            "TRUE",
            "FALSE",
            "true",
            "false",
            "True",
            "False",
            "1",
            "0",
            "yes",
            "no",
        ]
        expected = [
            True,
            False,
            True,
            False,
            True,
            False,
            True,
            False,
            True,
            False,
        ]
        header = "id,time,amount,observation,per_body_weight"
        rows = [
            "{subject},0,10,1.5,{flag}".format(subject=index + 1, flag=value)
            for index, value in enumerate(raw_values)
        ]
        csv_str = "\n".join([header] + rows)

        parser = DataParser()
        data = parser.parse_from_str(csv_str)

        self.assertEqual(
            data["PER_BODY_WEIGHT_KG"].tolist(),
            expected,
        )

    # A CSV where the amount column is populated on every row (dose *and*
    # observation rows) and an event id column distinguishes them: evid 1 =
    # dose, evid 0 = observation. Two subjects, each with one dose row at t=0
    # and two observation rows at t=1, t=2.
    EVENT_ID_CSV_ROWS = [
        # id, time, amount, observation, event_id, amount_var
        "1,0,100,.,1,central",
        "1,1,100,5.0,0,central",
        "1,2,100,3.0,0,central",
        "2,0,100,.,1,central",
        "2,1,100,6.0,0,central",
        "2,2,100,4.0,0,central",
    ]

    def _import(self, header, rows, name):
        csv_str = "\n".join([header] + rows)
        data = DataParser().parse_from_str(csv_str)
        dataset = Dataset.objects.create(name=name, datetime=timezone.now())
        dataset.replace_data(data)
        return dataset, data

    def test_event_id_classifies_doses_and_observations(self):
        # Even though every row has an amount, only the evid==1 rows should
        # become doses and only the evid==0 rows should become observations.
        header = "id,time,amount,observation,event_id,amount_var"
        dataset, _ = self._import(header, self.EVENT_ID_CSV_ROWS, "evid dataset")

        self.assertEqual(
            Dose.objects.filter(protocol__dataset=dataset).count(), 2
        )
        self.assertEqual(
            Biomarker.objects.filter(subject__dataset=dataset).count(), 4
        )

    def test_missing_event_id_falls_back_to_amount(self):
        # With no event id column, classification falls back to the presence of
        # an amount / observation value. Because every row has an amount, every
        # row is treated as a dose, and rows with an observation value are also
        # observations. This must not raise (regression test for int(None)).
        header = "id,time,amount,observation,amount_var"
        rows = [",".join(r.split(",")[:4] + [r.split(",")[5]])
                for r in self.EVENT_ID_CSV_ROWS]
        dataset, _ = self._import(header, rows, "no evid dataset")

        self.assertEqual(
            Dose.objects.filter(protocol__dataset=dataset).count(), 6
        )
        self.assertEqual(
            Biomarker.objects.filter(subject__dataset=dataset).count(), 4
        )

    def test_none_event_id_does_not_crash(self):
        # Defensive: a None-valued EVENT_ID column reaching replace_data must
        # fall back to the amount/observation heuristic rather than raising
        # TypeError from int(None).
        header = "id,time,amount,observation,amount_var"
        rows = [",".join(r.split(",")[:4] + [r.split(",")[5]])
                for r in self.EVENT_ID_CSV_ROWS]
        csv_str = "\n".join([header] + rows)
        data = DataParser().parse_from_str(csv_str)
        data["EVENT_ID"] = None

        dataset = Dataset.objects.create(
            name="none evid dataset", datetime=timezone.now()
        )
        dataset.replace_data(data)  # should not raise

        self.assertEqual(
            Dose.objects.filter(protocol__dataset=dataset).count(), 6
        )
        self.assertEqual(
            Biomarker.objects.filter(subject__dataset=dataset).count(), 4
        )

    def test_parse(self):
        for filename in [
            "datasets/TCB4dataset.csv",
            "datasets/demo_pk_data_upload.csv",
            "datasets/Mean%20IL6R%20for%20PKD%20explor%20plasma%20only%20with%20dosing%20export.csv",  # noqa: E501
            "datasets/CCL2_DRF_MLX_v06_export.csv",
            "usecase_monolix/TE_Data.txt",
            "usecase0/usecase0.csv",
            "usecase1/usecase1.csv",
            "usecase2/PKPD_UseCase_Abx.csv",
        ]:
            with urllib.request.urlopen(BASE_URL_DATASETS + filename, timeout=5) as f:
                csv_str = codecs.decode(f.read(), "utf-8")
            parser = DataParser()
            if filename == "usecase_monolix/TE_Data.txt":
                data = parser.parse_from_str(csv_str, delimiter="\t")
            else:
                data = parser.parse_from_str(csv_str)
            expected = [
                "SUBJECT_ID",
                "TIME",
                "AMOUNT",
                "OBSERVATION",
                "TIME_UNIT",
                "AMOUNT_UNIT",
                "OBSERVATION_UNIT",
                "OBSERVATION_NAME",
                "COMPOUND",
                "ADMINISTRATION_NAME",
                "INFUSION_TIME",
            ]
            for col in expected:
                self.assertIn(col, data.columns.tolist())

            dataset = Dataset.objects.create(
                name=filename,
                datetime=timezone.now(),
            )
            dataset.replace_data(data)

            if filename == "datasets/TCB4dataset.csv":
                biomarker_types_in_file = [
                    "IL2",
                    "IL10",
                    "IL6",
                    "IFNg",
                    "TNFa",
                    "Cells",
                ]
                covariate_columns = [
                    "subject_group",
                    "dose_group",
                    "cl",
                    "ytype",
                    "mdv",
                    "studyid",
                ]
                self.assertCountEqual(
                    biomarker_types_in_file + covariate_columns,
                    dataset.biomarker_types.values_list("name", flat=True),
                )

            if filename == "usecase0/usecase0.csv":
                # check that categorical covariate SEX is added
                self.assertIn(
                    "sex", dataset.biomarker_types.values_list("name", flat=True)
                )

                # check that SEX is "Male" for single subjects
                sex_bt = dataset.biomarker_types.get(name="sex")
                sex_data = sex_bt.data()
                self.assertEqual(len(sex_data["values"]), 1)
                self.assertEqual(sex_data["values"].iloc[0], "Male")

                # default display for covariates is false
                self.assertFalse(sex_bt.display)

            if filename == "datasets/demo_pk_data_upload.csv":
                # check the right biomarker_types are there
                biomarker_types_in_file = [
                    "Docetaxel",
                    "Red blood cells",
                    "Hemoglobin",
                    "Platelets ",
                    "White blood cells",
                    "Neutrophiles absolute",
                    "Lymphocytes absolute",
                    "Monocytes absolute",
                    "Eosinophils absolute",
                    "Basophils absolute",
                ]
                covariate_columns = [
                    "dose",
                    "cens",
                    "wt",
                    "ytype",
                    "mdv",
                    "studyid",
                    "species",
                    "sex",
                    "subject_group",
                    "studyid.1",
                    "dose_group",
                ]
                self.assertCountEqual(
                    dataset.biomarker_types.values_list("name", flat=True),
                    biomarker_types_in_file + covariate_columns,
                )

                # check the right number of subjects and protocols added
                self.assertEqual(dataset.subjects.count(), 66)
                protocols = list(dataset.protocols.all())
                self.assertEqual(len(protocols), 0)
            if filename == "usecase_monolix/TE_Data.txt":
                expected_names = ["observation", "dose", "dose_units", "dose_cat"]
                biomarker_names = dataset.biomarker_types.values_list("name", flat=True)
                self.assertCountEqual(biomarker_names, expected_names)
                expected_units = ["", "", "", ""]
                biomarker_units = dataset.biomarker_types.values_list(
                    "stored_unit__symbol", flat=True
                )
                self.assertCountEqual(biomarker_units, expected_units)
            if (
                filename
                == "datasets/Mean%20IL6R%20for%20PKD%20explor%20plasma%20only%20with%20dosing%20export.csv"  # noqa: E501
            ):
                # check the right number of subjects and protocols added
                self.assertEqual(dataset.subjects.count(), 3)
                protocols = list(dataset.protocols.all())
                self.assertEqual(len(protocols), 6)
            if filename == "datasets/CCL2_DRF_MLX_v06_export.csv":
                # check the right number of subjects and protocols added
                self.assertEqual(dataset.subjects.count(), 16)
                protocols = list(dataset.protocols.all())
                self.assertEqual(len(protocols), 5)
                groups = list(dataset.groups.all())
                self.assertEqual(len(groups), 5)
