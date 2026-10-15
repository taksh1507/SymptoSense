"""Build the SymCat 801-Disease CDC Clinical Knowledge Base and Bayesian Diagnostic Engine.

Loads the full 801 conditions from the SymCat CDC outpatient survey database.
"""
from parse_symcat_801 import parse_full_symcat_dataset

if __name__ == '__main__':
    parse_full_symcat_dataset()
