import React, { useState } from 'react';
import { Share2Icon, CopyIcon, LoaderIcon, CheckIcon } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './card';
import { supabase } from '@/lib/supabase';

interface ShareFileModalProps {
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ShareFileModal = ({ fileName, isOpen, onClose }: ShareFileModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7); 

  const generateShareLink = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      
      const shareId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      
      const { error: dbError } = await supabase
        .from('file_shares')
        .insert([
          { 
            id: shareId,
            file_name: fileName,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          }
        ]);

      if (dbError) throw dbError;


      const baseUrl = window.location.origin;
      const link = `${baseUrl}/share/${shareId}`;
      setShareLink(link);
    } catch (err) {
      console.error('Error generating share link:', err);
      setError('Failed to generate share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-md p-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Share File
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                Generate a secure link to share <strong>{fileName.replace('.encrypted', '')}</strong>
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Link expiry</label>
                <select 
                  className="w-full p-2 border rounded" 
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {shareLink ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Share link:</p>
                  <div className="flex">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="w-full p-2 border rounded-l text-sm"
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-l-none"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <CheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Remember to share the decryption password through a separate secure channel.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={generateShareLink}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2Icon className="w-4 h-4 mr-2" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-gray-500">
              Note: The recipient will need the decryption password to access the file content.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ShareFileModal;