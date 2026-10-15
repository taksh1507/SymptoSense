"""Single entry point: cd ml-service && python train_pipeline.py [options]."""
import argparse
import os
from ml_pipeline.ddx_training import train

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train SymptoSense DDXPlus diagnostic models")
    parser.add_argument('--train-rows', type=int, default=int(os.getenv('DDXPLUS_TRAIN_ROWS', '150000')),
                        help="Budget for sampled training rows")
    parser.add_argument('--realistic', dest='realistic', action='store_true', default=True,
                        help="Train with realistic evidence perturbation and evaluate on realistic input")
    parser.add_argument('--no-realistic', dest='realistic', action='store_false',
                        help="Disable realistic evidence perturbation (clean synthetic baseline mode)")
    parser.add_argument('--aug-copies', type=int, default=int(os.getenv('DDX_AUG_COPIES', '1')),
                        help="Number of perturbed training copies to augment clean training rows")
    args = parser.parse_args()
    train(train_limit=args.train_rows, realistic=args.realistic, aug_copies=args.aug_copies)
