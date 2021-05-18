from rest_framework import status
from rest_framework.test import APITestCase, APIClient


class DatasetTestCase(APITestCase):
    client = APIClient()

    def test_dataset_creation(self):
        data = {"name": "hello", "datatime": "", "description": "bye"}
        response = self.client.post("/api/datasets/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.data
        self.assertEqual(response_data["name"], data["name"])
        self.assertEqual(response_data["description"], data["description"])

        keys = response_data.keys()
        present_keys = ['name', 'datetime', 'description', 'subjects',
                        'biomarkertypes', 'protocols']
        for k in present_keys:
            self.assertTrue(k in keys)
