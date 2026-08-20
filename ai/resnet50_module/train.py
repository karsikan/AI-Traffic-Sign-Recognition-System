import os
import argparse
import torch
import torch.nn as nn
from torch.utils.data import Subset
import numpy as np
from dataset_loader import get_train_val_test_loaders
from torchvision import models

def main():
    parser = argparse.ArgumentParser(description="Train ResNet50 on GTSRB Dataset")
    parser.add_argument("--data_dir", type=str, default=r"D:\finall\finall\archive\Train",
                        help="Path to training images directory")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--subset", type=float, default=1.0, help="Fraction of dataset to use (0.0 to 1.0) for quick testing")
    parser.add_argument("--save_path", type=str, default="model/resnet50_traffic_sign.pth", help="Path to save model weights")
    args = parser.parse_args()

    # Create target model directory if it doesn't exist
    os.makedirs(os.path.dirname(args.save_path), exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training using device: {device}")

    # Load Data
    print(f"Loading data from {args.data_dir}...")
    train_loader, val_loader, _ = get_train_val_test_loaders(args.data_dir, batch_size=args.batch_size)
    
    # Optional subset split for dry run
    if args.subset < 1.0:
        print(f"Subsetting loaders to {args.subset*100}% of data for quick train...")
        # Subset train loader
        train_ds = train_loader.dataset
        train_indices = np.random.choice(len(train_ds), int(len(train_ds) * args.subset), replace=False)
        train_subset = Subset(train_ds, train_indices.tolist())
        train_loader = torch.utils.data.DataLoader(train_subset, batch_size=args.batch_size, shuffle=True)

        # Subset val loader
        val_ds = val_loader.dataset
        val_indices = np.random.choice(len(val_ds), int(len(val_ds) * args.subset), replace=False)
        val_subset = Subset(val_ds, val_indices.tolist())
        val_loader = torch.utils.data.DataLoader(val_subset, batch_size=args.batch_size, shuffle=False)

    print(f"Dataset summary:")
    print(f"  Train batches: {len(train_loader)}")
    print(f"  Validation batches: {len(val_loader)}")

    # Build ResNet50 model
    print("Building ResNet50 model...")
    # Try using weights parameter if supported by current torchvision, fallback to pretrained
    try:
        model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
    except AttributeError:
        model = models.resnet50(pretrained=True)
        
    # Modify final layer for 43 classes
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 43)
    model = model.to(device)

    # Loss and Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    # Learning rate scheduler
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)

    print("Starting training loop...")
    best_val_acc = 0.0

    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0

        for i, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            total_train += labels.size(0)
            correct_train += (predicted == labels).sum().item()

            if (i + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{args.epochs}], Step [{i+1}/{len(train_loader)}], Loss: {loss.item():.4f}")

        scheduler.step()

        epoch_loss = running_loss / total_train
        epoch_acc = (correct_train / total_train) * 100

        # Evaluate on validation set
        model.eval()
        correct_val = 0
        total_val = 0
        val_loss = 0.0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                
                _, predicted = torch.max(outputs, 1)
                total_val += labels.size(0)
                correct_val += (predicted == labels).sum().item()

        val_acc = (correct_val / total_val) * 100
        val_epoch_loss = val_loss / total_val

        print(f"Epoch [{epoch+1}/{args.epochs}] Summary:")
        print(f"  Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc:.2f}%")
        print(f"  Val Loss: {val_epoch_loss:.4f} | Val Acc: {val_acc:.2f}%")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), args.save_path)
            print(f"  ---> Saved best model with Val Acc: {val_acc:.2f}% to {args.save_path}")

    print(f"Training Complete. Best Validation Accuracy: {best_val_acc:.2f}%")

if __name__ == "__main__":
    main()
