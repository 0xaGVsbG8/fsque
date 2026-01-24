"use client";

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [status, setStatus] = useState<string>('');
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: 'Unknown',
    isSecureContext: false,
    hasFileSystemAPI: false
  });

  useEffect(() => {
    // Set browser info after component mounts to avoid hydration mismatch
    setBrowserInfo({
      userAgent: window.navigator.userAgent.split(' ').pop() || 'Unknown',
      isSecureContext: window.isSecureContext,
      hasFileSystemAPI: 'showSaveFilePicker' in window
    });
  }, []);

  const saveFileFallback = () => {
    console.log('Using fallback download method...');
    try {
      const exampleContent = `Hello from Krowa Test Page!

This file was created using fallback download method.
Timestamp: ${new Date().toISOString()}

Example data:
- Product ID: TEST_001
- User: Test User
- Action: File save test (fallback)
`;

      // Create a Blob with the content
      const blob = new Blob([exampleContent], { type: 'text/plain' });

      // Create a temporary URL for the blob
      const url = URL.createObjectURL(blob);

      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = 'krowa_test_file_fallback.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL
      URL.revokeObjectURL(url);

      setStatus('File downloaded successfully using fallback method!');
    } catch (error) {
      console.error('Error in fallback download:', error);
      setStatus(`Error downloading file: ${(error as Error).message}`);
    }
  };

  const saveFileModern = async () => {
    console.log('Save file button clicked (Modern API)!');
    try {
      // Check if the File System Access API is supported
      console.log('Checking File System Access API support...');
      if (!browserInfo.hasFileSystemAPI) {
        console.log('File System Access API not supported, trying fallback...');
        saveFileFallback();
        return;
      }
      console.log('File System Access API is supported');

      // Create some example content
      const exampleContent = `Hello from Krowa Test Page!

This file was created using the File System Access API.
Timestamp: ${new Date().toISOString()}

Example data:
- Product ID: TEST_001
- User: Test User
- Action: File save test
`;

      // Show save file picker
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: 'krowa_test_file.txt',
        types: [{
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt'],
          },
        }],
      });

      // Create a writable stream
      const writable = await fileHandle.createWritable();

      // Write the content
      await writable.write(exampleContent);

      // Close the stream
      await writable.close();

      setStatus(`File saved successfully as: ${fileHandle.name}`);
    } catch (error) {
      console.error('Error saving file:', error);
      if ((error as any).name === 'AbortError') {
        setStatus('File save was cancelled by user.');
      } else {
        setStatus(`Error saving file: ${(error as Error).message}`);
      }
    }
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor:'green'
    }}>
      <h1>File System API Test</h1>
      <p>This page demonstrates saving a file using the File System Access API (modern browsers) or fallback download method (all browsers).</p>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Browser: {browserInfo.userAgent}</p>
        <p>Secure Context: {browserInfo.isSecureContext ? 'Yes' : 'No'}</p>
        <p>API Supported: {browserInfo.hasFileSystemAPI ? 'Yes' : 'No'}</p>
      </div>

      <button
        onClick={() => alert('JavaScript is working!')}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          marginRight: '10px',
          marginBottom: '10px'
        }}
      >
        Test JS Alert
      </button>

      <button
        onClick={() => {
          console.log('Button clicked!');
          saveFileModern();
        }}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Save Example File
      </button>

      {status && (
        <div style={{
          padding: '10px',
          backgroundColor: status.includes('Error') ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${status.includes('Error') ? '#f44336' : '#4caf50'}`,
          borderRadius: '5px',
          marginTop: '10px'
        }}>
          <strong>Status:</strong> {status}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>How it works:</h3>
        <h4>Modern browsers (Chrome, Edge, Opera):</h4>
        <ol>
          <li>Click the "Save Example File" button</li>
          <li>Your browser will show a file picker dialog</li>
          <li>Choose where to save the file and click Save</li>
          <li>A text file with example content will be created</li>
        </ol>

        <h4>All browsers (including Firefox, Safari):</h4>
        <ol>
          <li>Click the "Save Example File" button</li>
          <li>The file will be automatically downloaded to your Downloads folder</li>
          <li>No file picker dialog - the file is saved directly</li>
        </ol>

        <h3>Browser Support:</h3>
        <p>The File System Access API is currently supported in:</p>
        <ul>
          <li>✅ Chrome 86+</li>
          <li>✅ Edge 86+</li>
          <li>✅ Opera 72+</li>
        </ul>
        <p>❌ Not supported in Firefox, Safari, or older browsers.</p>

        <h3>Requirements:</h3>
        <ul>
          <li>✅ Secure context (HTTPS or localhost)</li>
          <li>✅ User permission required</li>
          <li>✅ Modern Chromium-based browser</li>
        </ul>
      </div>
    </div>
  );
}