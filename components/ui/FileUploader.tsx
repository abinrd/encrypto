import React, { useState, useCallback } from 'react';
import { Upload, LoaderIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/utils';
import CryptoJS from 'crypto-js';

interface FileUploaderProps {
  onUploadComplete?: () => void;
}

interface UploadingFile {
  name: string;
  progress: number;
  status: 'uploading' | 'error' | 'complete';
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export const FileUploader = ({ onUploadComplete }: FileUploaderProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateFileProgress = (fileName: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => prev.map(file => 
      file.name === fileName ? { ...file, ...updates } : file
    ));
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'File type not supported';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 50MB limit';
    }
    return null;
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) {
      setError('Please select files to upload');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError(null);
    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    setUploadingFiles(prev => [...prev, ...newFiles]);

    for (const file of Array.from(files)) {
      const validationError = validateFile(file);
      if (validationError) {
        updateFileProgress(file.name, { 
          status: 'error',
          error: validationError
        });
        continue;
      }

      try {
        updateFileProgress(file.name, { progress: 25 });

        // Get file extension
        const fileExtension = file.name.split('.').pop() || '';
        
        // Create metadata object to store original file type
        const metadata = {
          originalType: file.type,
          originalExt: fileExtension
        };

        // Read and encrypt file with metadata
        const buffer = await file.arrayBuffer();
        const fileString = Buffer.from(buffer).toString('base64');
        const dataToEncrypt = JSON.stringify({
          content: fileString,
          metadata: metadata
        });
        
        const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, password).toString();
        
        updateFileProgress(file.name, { progress: 50 });
        
        // Create encrypted blob
        const encryptedBlob = new Blob([encrypted], { type: 'text/plain' });
        // Include extension in encrypted filename
        const fileName = `${Date.now()}-${file.name}.encrypted`;

        updateFileProgress(file.name, { progress: 75 });

        const { error: uploadError } = await supabase.storage
          .from('encrypted-files')
          .upload(fileName, encryptedBlob);

        if (uploadError) throw uploadError;

        updateFileProgress(file.name, { 
          status: 'complete',
          progress: 100
        });
      } catch (error) {
        console.error('Upload error:', error);
        updateFileProgress(file.name, { 
          status: 'error',
          error: 'Failed to upload file'
        });
      }
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(file => file.status === 'uploading'));
      if (onUploadComplete) {
        onUploadComplete();
      }
    }, 3000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure File Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="password"
              placeholder="Enter encryption password (min 8 characters)"
              className="w-full p-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              Drag and drop files here or click to select
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: 50MB
            </p>
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
              multiple
              accept={ALLOWED_TYPES.join(',')}
            />
          </div>

          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              {uploadingFiles.map((file) => (
                <div
                  key={file.name}
                  className="bg-gray-50 p-3 rounded-md"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm truncate">{file.name}</span>
                    {file.status === 'uploading' ? (
                      <span className="text-xs text-blue-500">{file.progress}%</span>
                    ) : file.status === 'error' ? (
                      <span className="text-xs text-red-500">Failed</span>
                    ) : (
                      <span className="text-xs text-green-500">Complete</span>
                    )}
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        file.status === 'error'
                          ? 'bg-red-500'
                          : file.status === 'complete'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  {file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploader;