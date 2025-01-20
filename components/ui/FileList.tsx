  import React, { useState, useEffect } from 'react';
  import { FileIcon, DownloadIcon, TrashIcon, LoaderIcon } from 'lucide-react';
  import { Card, CardContent, CardHeader, CardTitle } from './card';
  import { Button } from './button';
  import { supabase } from '@/lib/supabase';
  import { formatFileSize, formatDate } from '@/lib/utils';
  import CryptoJS from 'crypto-js';

  const FileList = () => {
    const [files, setFiles] = useState<any[]>([]);
    const [downloadPassword, setDownloadPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [operatingFiles, setOperatingFiles] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const addOperatingFile = (fileId: string) => {
      setOperatingFiles(prev => new Set(prev).add(fileId));
    };

    const removeOperatingFile = (fileId: string) => {
      setOperatingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    };

    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .storage
          .from('encrypted-files')
          .list();

        if (error) throw error;
        setFiles(data || []);
      } catch (error) {
        console.error('Error fetching files:', error);
        setError('Failed to fetch files. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    const handleDelete = async (fileName: string) => {
      if (!confirm('Are you sure you want to delete this file?')) return;

      try {
        addOperatingFile(fileName);
        setError(null);

        console.log('Attempting to delete:', fileName);

        const { error } = await supabase
          .storage
          .from('encrypted-files')
          .remove([fileName]);

        if (error) {
          console.error('Delete error:', error);
          throw error;
        }

        console.log('Delete successful');
        setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));

      } catch (error) {
        console.error('Error deleting file:', error);
        setError('Failed to delete file. Please try again.');
      } finally {
        removeOperatingFile(fileName);
      }
    };

    // Modify the handleDownload function to handle file types correctly
    const handleDownload = async (fileName: string) => {
      if (!downloadPassword) {
        setError('Please enter the decryption password');
        return;
      }
  
      try {
        addOperatingFile(fileName);
        setError(null);
  
        const { data, error } = await supabase
          .storage
          .from('encrypted-files')
          .download(fileName);
  
        if (error) throw error;
  
        const encryptedText = await data.text();
  
        try {
          // Decrypt the content
          const decrypted = CryptoJS.AES.decrypt(encryptedText, downloadPassword)
            .toString(CryptoJS.enc.Utf8);
          
          if (!decrypted) {
            throw new Error('Decryption failed - wrong password');
          }
  
          // Convert the decrypted base64 string back to binary data
          const binaryString = atob(decrypted);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
  
          // Extract original filename and extension
          const originalFileName = fileName
            .split('-')
            .slice(1) // Remove timestamp
            .join('-')
            .replace('.encrypted', '');
  
          // Get the correct MIME type
          const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || '';
          const mimeType = getMimeType(fileExtension);
  
          // Create blob with correct MIME type
          const blob = new Blob([bytes], { type: mimeType });
          
          // Trigger download with original filename
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = originalFileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
  
        } catch (decryptError) {
          console.error('Decryption error:', decryptError);
          setError('Incorrect password or corrupted file');
        }
      } catch (error) {
        console.error('Download error:', error);
        setError('Failed to download file. Please try again.');
      } finally {
        removeOperatingFile(fileName);
      }
    };
  
    // Updated getMimeType function to handle extensions directly
    const getMimeType = (extension: string): string => {
      const mimeTypes: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        // Add more mappings as needed
      };
      return mimeTypes[extension] || 'application/octet-stream';
    };

    useEffect(() => {
      fetchFiles();
    }, []);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Your Files
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
              disabled={loading}
            >
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Enter decryption password"
                className="w-full p-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={downloadPassword}
                onChange={(e) => setDownloadPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderIcon className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No files uploaded yet
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileIcon className="w-5 h-5 flex-shrink-0 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name.replace('.encrypted', '')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.metadata?.size || 0)} • {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file.name)}
                        disabled={operatingFiles.has(file.name)}
                      >
                        {operatingFiles.has(file.name) ? (
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <DownloadIcon className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(file.name)} 
                        disabled={operatingFiles.has(file.name)}
                      >
                        {operatingFiles.has(file.name) ? (
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  export default FileList;