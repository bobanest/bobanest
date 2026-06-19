'use client';
import { useState } from 'react';

export default function ImageUpload({ onUpload, currentImageUrl }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl || '');
  const [error, setError] = useState('');

  const uploadToCloudinary = async (file) => {
    if (!file) return;
    
    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'bobanest_preset'); // Must exist in Cloudinary (unsigned)
    formData.append('cloud_name', 'dyo42wvne');
    formData.append('folder', 'bobanest/products');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dyo42wvne/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      if (data.secure_url) {
        // Automatically crop to the cup shape (removes transparent padding)
        const croppedUrl = data.secure_url.replace('/upload/', '/upload/c_thumb,g_auto/');
        setPreview(croppedUrl);
        onUpload(croppedUrl);
      } else {
        throw new Error('Upload failed – no secure_url returned');
      }
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      setError(err.message || 'Upload failed. Check preset and cloud name.');
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={(e) => uploadToCloudinary(e.target.files[0])} 
        disabled={uploading}
      />
      {uploading && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      {preview && !uploading && (
        <img src={preview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded border" />
      )}
    </div>
  );
}