# Contributing to the PKPDApp

The PKPDApp is built with the Django framework and as such adheres largely to Django's philosophy - one project contains multiple smaller apps that each perform exactly one task and are as self-contained as possible. As a result, the PKPDApp is really a collection of smaller apps that take care of model building, result illustration and so on.

## Repository Structure

To meet the modular structure of Django apps, the repository is organised in 3 layers

1) `\pkpdapp`: The top level folder that contains administrative files, such as `setup.py`, `README.md` or this file `CONTRIBUTING.md`.
2) `\pkpdapp\pkpdapp`: The Django project folder that contains the various smaller apps and the executible `manage.py`.
3) `\pkpdapp\pkdpapp\pkpdapp`: The website application that defines the structure of the PKPDApp.

## Summary of apps

Apps in the PKPDApp can be broadly categorised into function and integration apps. Function apps are applications that perform a specific function, for example building a model, simulating the model or providing a plotting interface for simulation results. Those individual apps may be used at multiple occasions in the PKPDApp, i.e. for simulation or inference. The integration apps are applications that patch various functional apps together, and are in essence responsible for a good user experience.

For an overview of apps and their purpose in the PKPDApp, please check out the list below. We will reference all apps realtive to the Django project root `\pkpdapp\pkdpapp`.

- `\pkpdapp`: The main app of the website. It defines base templates and the url structure of the PKPDApp.

