# What is the PKPDApp?

It's a web application for modeling the distribution and effects of drugs. It is currently in its infancy, but we plan to build an application with an intuitive user interface for

- creating pharmacokinetic (PK), pharmacodynamic (PD) and PKPD models,

- creating statistical, population models 

- exploring the properties of drug models by forward simulation for different
  - parameter regimes
  - different dosing schedules and administration routes
  - different population models
  - different noise models

- finding the best model for a given dataset

At heart of the app is it to provide a best-practice pipeline for PKPD modeling that will make it easier to compare different modelling strategies. 

If you are interested and would like to contribute to the project, you are welcome to drop me an email. Especially at a later stage of the project, when the basic architecture of the app is sorted out, contributions will be very welcome.

# Development

The PKPDApp is being built with Django's API, and as such supports the idea of reusable applications. The PKPDApp will therefore be split into mutliple smaller applications that are either imported from existing [Django Packages](https://djangopackages.org) or implemented and made availbale as Django packages. A quick guide for building resuable apps in Django is available [here](https://docs.djangoproject.com/en/3.0/intro/reusable-apps/).

For further guidance on how to build Django apps we recommend Django's documentation, and its

- [How to](https://docs.djangoproject.com/en/3.0/howto/)
- [Using Django](https://docs.djangoproject.com/en/3.0/topics/)
- [API Reference](https://docs.djangoproject.com/en/3.0/ref/)

Proper guidelines for contributions will follow soon.
