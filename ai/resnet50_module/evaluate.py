import os
import argparse
import torch
import torch.nn as nn
import numpy as np
import matplotlib.pyplot as plt
from dataset_loader import get_train_val_test_loaders, GTSRBTestDataset
from torch.utils.data import DataLoader
from torchvision import models

def calculate_metrics(all_preds, all_labels, num_classes=43):
    try:
        from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
        preds = np.array(all_preds)
        labels = np.array(all_labels)
        accuracy = accuracy_score(labels, preds)
        precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='macro', zero_division=0)
        w_precision, w_recall, w_f1, _ = precision_recall_fscore_support(labels, preds, average='weighted', zero_division=0)
        cm = confusion_matrix(labels, preds)
        
        return {
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "weighted_precision": w_precision,
            "weighted_recall": w_recall,
            "weighted_f1": w_f1,
            "confusion_matrix": cm,
            "sklearn": True
        }
    except ImportError:
        # Custom fallback calculation using NumPy
        preds = np.array(all_preds)
        labels = np.array(all_labels)
        accuracy = np.mean(preds == labels)
        
        tp = np.zeros(num_classes)
        fp = np.zeros(num_classes)
        fn = np.zeros(num_classes)
        
        for c in range(num_classes):
            tp[c] = np.sum((preds == c) & (labels == c))
            fp[c] = np.sum((preds == c) & (labels != c))
            fn[c] = np.sum((preds != c) & (labels == c))
            
        precision_c = np.zeros(num_classes)
        recall_c = np.zeros(num_classes)
        f1_c = np.zeros(num_classes)
        
        for c in range(num_classes):
            precision_c[c] = tp[c] / (tp[c] + fp[c]) if (tp[c] + fp[c]) > 0 else 0.0
            recall_c[c] = tp[c] / (tp[c] + fn[c]) if (tp[c] + fn[c]) > 0 else 0.0
            f1_c[c] = 2 * (precision_c[c] * recall_c[c]) / (precision_c[c] + recall_c[c]) if (precision_c[c] + recall_c[c]) > 0 else 0.0
            
        macro_precision = np.mean(precision_c)
        macro_recall = np.mean(recall_c)
        macro_f1 = np.mean(f1_c)
        
        class_counts = np.bincount(labels, minlength=num_classes)
        total_samples = len(labels)
        weighted_precision = np.sum(precision_c * class_counts) / total_samples if total_samples > 0 else 0
        weighted_recall = np.sum(recall_c * class_counts) / total_samples if total_samples > 0 else 0
        weighted_f1 = np.sum(f1_c * class_counts) / total_samples if total_samples > 0 else 0
        
        cm = np.zeros((num_classes, num_classes), dtype=int)
        for p, l in zip(preds, labels):
            cm[l, p] += 1
            
        return {
            "accuracy": accuracy,
            "precision": macro_precision,
            "recall": macro_recall,
            "f1": macro_f1,
            "weighted_precision": weighted_precision,
            "weighted_recall": weighted_recall,
            "weighted_f1": weighted_f1,
            "confusion_matrix": cm,
            "sklearn": False
        }

def plot_confusion_matrix(cm, save_path="confusion_matrix.png"):
    plt.figure(figsize=(16, 12))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title("Confusion Matrix - ResNet50 Traffic Sign Recognition")
    plt.colorbar()
    tick_marks = np.arange(43)
    plt.xticks(tick_marks, [str(i) for i in range(43)], rotation=90)
    plt.yticks(tick_marks, [str(i) for i in range(43)])
    
    plt.ylabel('True Class ID')
    plt.xlabel('Predicted Class ID')
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"Confusion matrix plot saved to {save_path}")

def main():
    parser = argparse.ArgumentParser(description="Evaluate ResNet50 Model")
    parser.add_argument("--model_path", type=str, default="model/resnet50_traffic_sign.pth", help="Path to model weights file")
    parser.add_argument("--data_dir", type=str, default=r"D:\finall\finall\archive\Train",
                        help="Path to training directory (used if test_dir/test_csv is not specified)")
    parser.add_argument("--test_dir", type=str, default=r"D:\finall\finall\archive\Test",
                        help="Path to official flat test images directory")
    parser.add_argument("--test_csv", type=str, default=r"D:\finall\finall\archive\Test.csv",
                        help="Path to official test CSV file")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluation using device: {device}")

    # Build model architecture
    print("Building ResNet50 model structure...")
    try:
        model = models.resnet50(weights=None)
    except TypeError:
        model = models.resnet50()
        
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 43)
    
    # Load model weights
    if not os.path.exists(args.model_path):
        print(f"Error: Model weights not found at {args.model_path}")
        print("Please run train.py first to train a model.")
        return
        
    print(f"Loading weights from {args.model_path}...")
    model.load_state_dict(torch.load(args.model_path, map_location=device))
    model = model.to(device)
    model.eval()

    # Determine which test set to load
    # If official test directory and CSV exist, load them. Otherwise fall back to the 10% test split from training.
    if os.path.exists(args.test_dir) and os.path.exists(args.test_csv):
        print(f"Loading official Test Set from {args.test_dir}...")
        test_dataset = GTSRBTestDataset(args.test_dir, args.test_csv)
        test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    else:
        print(f"Official test data not found. Loading 10% testing split from {args.data_dir}...")
        _, _, test_loader = get_train_val_test_loaders(args.data_dir, batch_size=args.batch_size)

    print(f"Evaluating {len(test_loader.dataset)} test images...")
    
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs, 1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())

    # Calculate metrics
    print("Calculating evaluation metrics...")
    metrics = calculate_metrics(all_preds, all_labels)

    # Print results
    print("=" * 45)
    print("           Evaluation Results               ")
    print("=" * 45)
    print(f"Accuracy:           {metrics['accuracy']*100:.2f}%")
    print(f"Macro Precision:    {metrics['precision']*100:.2f}%")
    print(f"Macro Recall:       {metrics['recall']*100:.2f}%")
    print(f"Macro F1 Score:     {metrics['f1']*100:.2f}%")
    print("-" * 45)
    print(f"Weighted Precision: {metrics['weighted_precision']*100:.2f}%")
    print(f"Weighted Recall:    {metrics['weighted_recall']*100:.2f}%")
    print(f"Weighted F1 Score:  {metrics['weighted_f1']*100:.2f}%")
    print(f"Metrics engine:     {'scikit-learn' if metrics['sklearn'] else 'Custom NumPy implementation'}")
    print("=" * 45)

    # Save Confusion Matrix plot
    plot_confusion_matrix(metrics['confusion_matrix'])

if __name__ == "__main__":
    main()
