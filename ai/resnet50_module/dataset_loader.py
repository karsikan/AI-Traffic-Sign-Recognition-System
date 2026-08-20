import os
import cv2
import csv
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, random_split

class GTSRBDataset(Dataset):
    """
    Custom GTSRB Dataset that loads images using OpenCV, resizes them to 224x224,
    applies optional torchvision transforms (data augmentation), and returns a PyTorch tensor.
    """
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.image_paths = []
        self.labels = []
        self.transform = transform
        
        if not os.path.exists(root_dir):
            raise FileNotFoundError(f"Directory {root_dir} does not exist.")
            
        # Supports both Kaggle format (0,1,2...) and old GTSRB format (00000,00001...)
        for class_id in range(43):
            class_dir = os.path.join(root_dir, str(class_id))

            # Fallback for zero-padded folder names (e.g. "00000" instead of "0")
            if not os.path.exists(class_dir):
                class_dir = os.path.join(root_dir, f"{class_id:05d}")
                
            if os.path.exists(class_dir):
                for fname in os.listdir(class_dir):
                    if fname.lower().endswith(('.ppm', '.png', '.jpg', '.jpeg')):
                        self.image_paths.append(os.path.join(class_dir, fname))
                        self.labels.append(class_id)
                        
        if len(self.image_paths) == 0:
            print(f"Warning: No images found in {root_dir}")

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        
        # Load image via OpenCV
        image = cv2.imread(img_path)
        if image is None:
            raise IOError(f"Could not read image: {img_path}")
            
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to 224x224
        image = cv2.resize(image, (224, 224))
        
        if self.transform:
            from PIL import Image
            image_pil = Image.fromarray(image)
            image_tensor = self.transform(image_pil)
        else:
            # Normalize to [0, 1]
            image = image.astype(np.float32) / 255.0
            
            # Normalize with ImageNet stats
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            image = (image - mean) / std
            
            # HWC to CHW
            image = image.transpose(2, 0, 1)
            image_tensor = torch.tensor(image, dtype=torch.float32)
        
        return image_tensor, torch.tensor(self.labels[idx], dtype=torch.long)


class GTSRBTestDataset(Dataset):
    """
    Custom GTSRB Test Dataset that reads the Kaggle CSV mapping file and loads test images.
    CSV format: Width,Height,Roi.X1,Roi.Y1,Roi.X2,Roi.Y2,ClassId,Path
    """
    def __init__(self, images_dir, csv_path):
        self.images_dir = images_dir
        self.csv_path = csv_path
        self.image_paths = []
        self.labels = []

        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file {csv_path} does not exist.")

        # Detect archive root (parent of Test/ folder)
        archive_root = os.path.dirname(images_dir)

        with open(csv_path, 'r') as f:
            # Kaggle GTSRB test CSV uses ',' as delimiter
            reader = csv.reader(f, delimiter=',')
            next(reader)  # Skip header
            for row in reader:
                if len(row) >= 8:
                    path_col = row[7].strip()   # e.g. "Test/00000.png"
                    class_id = int(row[6])       # ClassId column
                    full_path = os.path.join(archive_root, path_col)
                    self.image_paths.append(full_path)
                    self.labels.append(class_id)
                    
        if len(self.image_paths) == 0:
            print(f"Warning: No images loaded from CSV: {csv_path}")

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = cv2.imread(img_path)
        if image is None:
            raise IOError(f"Could not read image: {img_path}")
            
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, (224, 224))
        
        # Normalize
        image = image.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        image = (image - mean) / std
        
        # HWC to CHW
        image = image.transpose(2, 0, 1)
        
        return torch.tensor(image, dtype=torch.float32), torch.tensor(self.labels[idx], dtype=torch.long)


class CustomSubset(Dataset):
    def __init__(self, subset, transform=None):
        self.subset = subset
        self.transform = transform

    def __getitem__(self, idx):
        original_dataset = self.subset.dataset
        real_idx = self.subset.indices[idx]
        
        img_path = original_dataset.image_paths[real_idx]
        label = original_dataset.labels[real_idx]
        
        image = cv2.imread(img_path)
        if image is None:
            raise IOError(f"Could not read image: {img_path}")
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, (224, 224))
        
        if self.transform:
            from PIL import Image
            image_pil = Image.fromarray(image)
            image_tensor = self.transform(image_pil)
        else:
            image = image.astype(np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            image = (image - mean) / std
            image = image.transpose(2, 0, 1)
            image_tensor = torch.tensor(image, dtype=torch.float32)
            
        return image_tensor, torch.tensor(label, dtype=torch.long)

    def __len__(self):
        return len(self.subset)


def get_train_val_test_loaders(root_dir, batch_size=32, pin_memory=True, train_transform=None, val_transform=None):
    """
    Loads the training set and splits it into:
    - Training (80%)
    - Validation (10%)
    - Testing (10%)
    Returns DataLoader objects for each split.
    """
    dataset = GTSRBDataset(root_dir)
    total_len = len(dataset)
    
    if total_len == 0:
        raise ValueError(f"No training data found in {root_dir}")
        
    val_len = int(total_len * 0.10)
    test_len = int(total_len * 0.10)
    train_len = total_len - val_len - test_len
    
    # Use manual seed for reproducibility of splits
    train_set, val_set, test_set = random_split(
        dataset, [train_len, val_len, test_len],
        generator=torch.Generator().manual_seed(42)
    )
    
    # Wrap with CustomSubset to apply proper transforms
    train_subset = CustomSubset(train_set, transform=train_transform)
    val_subset = CustomSubset(val_set, transform=val_transform)
    test_subset = CustomSubset(test_set, transform=val_transform)
    
    # Create DataLoaders
    num_workers = 0
    
    train_loader = DataLoader(train_subset, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=pin_memory)
    val_loader = DataLoader(val_subset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=pin_memory)
    test_loader = DataLoader(test_subset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=pin_memory)
    
    return train_loader, val_loader, test_loader
