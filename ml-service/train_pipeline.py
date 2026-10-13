"""Single entry point: cd ml-service && python train_pipeline.py [train-row-budget]."""
import argparse
import os
from ml_pipeline.ddx_training import train

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--train-rows', type=int, default=int(os.getenv('DDXPLUS_TRAIN_ROWS', '150000')))
    args = parser.parse_args()
    train(args.train_rows)
