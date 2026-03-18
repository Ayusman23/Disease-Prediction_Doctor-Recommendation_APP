"""
AI VISION MODEL TRAINER (TensorFlow / Keras)
---------------------------------------------
This script trains a Convolutional Neural Network (CNN) specifically for diagnosing 
up to 200+ medical skin diseases and visible symptoms using transfer learning (MobileNetV2).

HOW TO ADD YOUR DATASET:
1. Since a 200-disease image dataset is ~5GB-15GB, you need to download it locally to your PC.
   Recommended Dataset: "HAM10000" (Skin Cancer) or "DermNet" from Kaggle.com
   Link: https://www.kaggle.com/datasets/shubhamgoel27/dermnet

2. Extract inside your 'doctor-recommender-app/server/DPDR/dataset' folder like this:
   dataset/
    ├── Acne/            (Put 50+ images of Acne here)
    ├── Melanoma/        (Put 50+ images of Melanoma here)
    ├── Eczema/          (Put 50+ images of Eczema here)
    ├── Psoriasis/       ...etc (Create folders for each of your 200 diseases)

3. Install required libraries on your terminal:
   pip install tensorflow pillow scikit-learn numpy flask-cors

4. Run this script:
   cd server/DPDR
   python train_vision_model.py

5. It will automatically detect your folders, scale the images, train the AI model, 
   and output 'vision_model.h5' and 'vision_classes.json'. 
   The 'app.py' server will then use these to predict uploads from the frontend!
"""

import os
import json
import numpy as np

try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
    from tensorflow.keras.models import Model
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
except ImportError:
    print("❌ TensorFlow is not installed! Please run: pip install tensorflow")
    exit(1)

# Configuration
DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset", "archive", "train")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "vision_model.h5")
CLASSES_PATH = os.path.join(os.path.dirname(__file__), "vision_classes.json")
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 3

def train_model():
    print(f"\n🔍 Scanning dataset folder: {DATASET_DIR}")
    
    if not os.path.exists(DATASET_DIR) or not os.listdir(DATASET_DIR):
        print("❌ Dataset folder is empty!")
        print("Please create folders like 'dataset/Acne' and put images inside them to train.")
        return

    # 1. Prepare Data Generators (with data augmentation to prevent overfitting)
    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2 # Use 20% for testing during training
    )

    print("\n📦 Loading Training Data...")
    train_generator = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    print("\n📦 Loading Validation Data...")
    val_generator = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    num_classes = train_generator.num_classes
    class_indices = train_generator.class_indices
    # Reverse dict to map ID -> Category Name
    labels = {v: k for k, v in class_indices.items()}

    print(f"\n✅ Found {num_classes} disease classes: {list(labels.values())}")

    # Save class names for app.py to use later
    with open(CLASSES_PATH, 'w') as f:
        json.dump(labels, f)

    # 2. Build the Neural Network
    print("\n🧠 Building Convolutional Neural Network (MobileNetV2 Transfer Learning)...")
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    # Freeze the base model layers (so we don't destroy pre-trained features)
    for layer in base_model.layers:
        layer.trainable = False

    # Add custom layers for our diseases
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.4)(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)

    # Compile the model
    model.compile(optimizer=Adam(learning_rate=0.001), 
                  loss='categorical_crossentropy', 
                  metrics=['accuracy'])

    # 3. Callbacks to save the best model & stop if not improving
    callbacks = [
        ModelCheckpoint(MODEL_PATH, save_best_only=True, monitor='val_accuracy', mode='max', verbose=1),
        EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    ]

    # 4. Train!
    print(f"\n🚀 Starting Training for {EPOCHS} Epochs...")
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=EPOCHS,
        callbacks=callbacks
    )

    print(f"\n🎉 Training Complete! Model saved successfully to '{MODEL_PATH}'")
    print("You can now restart your Flask backend (app.py) to use your powerful custom AI!")

if __name__ == "__main__":
    train_model()
