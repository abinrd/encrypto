import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import CryptoJS from 'crypto-js';

export const FileUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState('');

  const handleUpload = async (files: FileList | null) => {
    if (!files || !password) {
      alert('Please select files and enter a password');
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Read file
        const buffer = await file.arrayBuffer();
        const fileString = Buffer.from(buffer).toString('base64');
        
        // Encrypt file content
        const encrypted = CryptoJS.AES.encrypt(fileString, password).toString();
        
        // Create blob from encrypted content
        const encryptedBlob = new Blob([encrypted], { type: 'text/plain' });
        const fileName = `${Date.now()}-${file.name}.encrypted`;

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('encrypted-files') // Make sure this bucket exists
          .upload(fileName, encryptedBlob);

        if (error) throw error;
      }
      
      alert('Files uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure File Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <input
          type="password"
          placeholder="Enter encryption password"
          className="w-full p-2 mb-4 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <div 
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onDrop={(e) => {
            e.preventDefault();
            handleUpload(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">
            {uploading ? 'Uploading...' : 'Drag and drop files here or click to select'}
          </p>
          <input
            type="file"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
            multiple
          />
          
          {uploading && (
            <div className="mt-4">
              <div className="animate-pulse text-blue-500">Encrypting and uploading...</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploader;