#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# This file has been adapted from PINTS (https://github.com/pints-team/pints/)
# which is released under the BSD 3-clause license.
#

from __future__ import absolute_import, division
from __future__ import print_function, unicode_literals
import argparse
import datetime
import os
import sys


def run_copyright_checks():
    """
    Checks that the copyright year in LICENSE.md is up-to-date and that each
    file contains the copyright header
    """
    print('\nChecking that copyright is up-to-date and complete.')

    year_check = True
    current_year = str(datetime.datetime.now().year)

    with open('LICENSE.md', 'r') as license_file:
        license_text = license_file.read()
        if 'Copyright (c) ' + current_year in license_text:
            print("Copyright notice in LICENSE.md is up-to-date.")
        else:
            print('Copyright notice in LICENSE.md is NOT up-to-date.')
            year_check = False

    # Recursively walk the pkpd directory and check copyright header is in
    # each checked file type
    header_check = True
    checked_file_types = ['.py']
    copyright_header = """#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#"""

    for dirname, _, file_list in os.walk('pkpdapp'):
        for f_name in file_list:
            if any([f_name.endswith(x) for x in checked_file_types]):
                path = os.path.join(dirname, f_name)
                with open(path, 'r') as f:
                    if copyright_header not in f.read():
                        print('Copyright blurb missing from ' + path)
                        header_check = False

    if header_check:
        print('All files contain copyright header.')

    if not year_check or not header_check:
        print('FAILED')
        sys.exit(1)


if __name__ == '__main__':
    # Set up argument parsing
    parser = argparse.ArgumentParser(
        description='Run tests for PKPDApp.',
        # TODO:
        epilog='To run individual unit tests, use e.g.'
               ' $ pkpd/tests/test_toy_logistic_model.py',
    )

    # Copyright checks
    parser.add_argument(
        '--copyright',
        action='store_true',
        help='Check copyright runs to the current year',)

    # Parse!
    args = parser.parse_args()

    # Run tests
    has_run = False

    # Copyright checks
    if args.copyright:
        has_run = True
        run_copyright_checks()

    # Help
    if not has_run:
        parser.print_help()
