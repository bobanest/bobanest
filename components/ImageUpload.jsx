'use client';
import { useState } from 'react';

export default function ImageUpload({ onUpload, currentImageUrl }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl || '');

  const uploadToCloudinary = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'bobanest_preset'); // Create unsigned preset in Cloudinary

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPreview(data.secure_url);
      onUpload(data.secure_url);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Image upload failed. Check Cloudinary preset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={(e) => uploadToCloudinary(e.target.files[0])} />
      {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
      {preview && <img src={preview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />}
    </div>
  );
}