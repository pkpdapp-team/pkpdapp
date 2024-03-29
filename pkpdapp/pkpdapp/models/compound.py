#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import (
    Unit,
)


def get_mol_mass_unit():
    try:
        return Unit.objects.get(symbol='g/mol')
    except Unit.DoesNotExist:
        return None


def get_intrinsic_clearence_unit():
    try:
        return Unit.objects.get(symbol='µL/min/mg')
    except Unit.DoesNotExist:
        return None


def get_target_concentration_unit():
    try:
        return Unit.objects.get(symbol='nmol/L')
    except Unit.DoesNotExist:
        return None


def get_dissociation_constant_unit():
    try:
        return Unit.objects.get(symbol='nmol/L')
    except Unit.DoesNotExist:
        return None


class Compound(models.Model):
    """
    """

    name = models.CharField(
        max_length=100, help_text='name of the compound'
    )
    description = models.TextField(
        help_text='short description of the compound',
        blank=True, default=''
    )
    use_efficacy = models.ForeignKey(
        'EfficacyExperiment', on_delete=models.SET_NULL,
        null=True,
        related_name='compound_using',
    )
    molecular_mass = models.FloatField(
        default=500.0,
        help_text=(
            'molecular mass for compound for conversion from mol to grams'
        )
    )
    molecular_mass_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        default=get_mol_mass_unit,
        related_name='compound_mol_mass',
        help_text='unit for molecular mass (e.g. g/mol)'
    )

    class CompoundType(models.TextChoices):
        SMALL_MOLECULE = 'SM', 'Small Molecule'
        LARGE_MOLECULE = 'LM', 'Large Molecule'

    compound_type = models.CharField(
        max_length=2,
        choices=CompoundType.choices,
        default=CompoundType.SMALL_MOLECULE,
    )

    fraction_unbound_plasma = models.FloatField(
        default=0.02,
        blank=True, null=True,
        help_text='fraction unbound plasma (unitless)'
    )

    blood_to_plasma_ratio = models.FloatField(
        default=1.0,
        blank=True, null=True,
        help_text='blood to plasma ratio (unitless)'
    )

    intrinsic_clearance = models.FloatField(
        blank=True, null=True,
        help_text='intrinsic clearance'
    )

    intrinsic_clearance_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        default=get_intrinsic_clearence_unit,
        related_name='compounds_clint',
        help_text='unit for intrinsic clearance'
    )

    class AssayType(models.TextChoices):
        MICROSOMES = 'MS', 'Microsomes'
        HEPATOCYTES = 'HC', 'Hepatocytes'

    intrinsic_clearance_assay = models.CharField(
        max_length=2,
        choices=AssayType.choices,
        default=AssayType.MICROSOMES,
    )

    fraction_unbound_including_cells = models.FloatField(
        default=1.0,
        blank=True, null=True,
        help_text='fraction unbound in plasma and red blood cells (unitless)'
    )

    # -------
    # Target
    # -------

    target_molecular_mass = models.FloatField(
        default=25000.0,
        help_text=(
            'molecular mass for target for conversion from mol to grams'
        ),
    )

    target_molecular_mass_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        default=get_mol_mass_unit,
        related_name='compounds_target_mol_mass',
        help_text='unit for target molecular mass (e.g. g/mol)'
    )

    target_concentration = models.FloatField(
        default=1.0,
        blank=True, null=True,
        help_text='target concentration'
    )

    target_concentration_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        default=get_target_concentration_unit,
        related_name='compounds_target_conc',
        help_text='unit for target concentration'
    )

    dissociation_constant = models.FloatField(
        blank=True, null=True,
        help_text='dissociation constant'
    )

    dissociation_unit = models.ForeignKey(
        Unit, on_delete=models.PROTECT,
        related_name='compounds_kd',
        default=get_dissociation_constant_unit,
        help_text='unit for dissociation constant'
    )

    is_soluble = models.BooleanField(
        default=True,
        help_text='is the compound target soluble'
    )

    def get_project(self):
        return self.project

    def __str__(self):
        return str(self.name)

    def copy(self):
        kwargs = {
            'name': self.name,
            'description': self.description,
            'molecular_mass': self.molecular_mass,
            'molecular_mass_unit': self.molecular_mass_unit,
            'fraction_unbound_plasma': self.fraction_unbound_plasma,
            'blood_to_plasma_ratio': self.blood_to_plasma_ratio,
            'intrinsic_clearance': self.intrinsic_clearance,
            'intrinsic_clearance_unit': self.intrinsic_clearance_unit,
            'intrinsic_clearance_assay': self.intrinsic_clearance_assay,
            'fraction_unbound_including_cells': self.fraction_unbound_including_cells,
            'target_molecular_mass': self.target_molecular_mass,
            'target_molecular_mass_unit': self.target_molecular_mass_unit,
            'target_concentration': self.target_concentration,
            'target_concentration_unit': self.target_concentration_unit,
            'dissociation_constant': self.dissociation_constant,
            'dissociation_unit': self.dissociation_unit,
            'is_soluble': self.is_soluble,
            'compound_type': self.compound_type,
        }
        new_compound = Compound.objects.create(**kwargs)
        for efficacy_experiment in self.efficacy_experiments.all():
            efficacy_experiment.copy(new_compound)
        return new_compound
