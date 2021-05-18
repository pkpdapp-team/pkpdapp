from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from django.urls import reverse


class DatasetTestCase(APITestCase):

    def test_dataset_creation(self):
        data = {"name": "hello", "datatime": "", "description": ""}
        response = self.client.post("/api/datasets/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
