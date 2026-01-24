"use client";

import { useState } from 'react';

// Method 1: Direct Uint8Array for known binary data
const createBinaryData = (): Uint8Array => {
  // PNG signature bytes: 89 50 4E 47 0D 0A 1A 0A
  return new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
};

// Method 2: Convert from Python bytes string to JavaScript Uint8Array
const pythonBytesToJS = (pythonBytesString: string): Uint8Array => {
  // Remove the b'...' wrapper if present
  const cleanString = pythonBytesString.replace(/^b['"]|['"]$/g, '');

  const bytes: number[] = [];
  let i = 0;

  while (i < cleanString.length) {
    if (cleanString[i] === '\\' && cleanString[i + 1] === 'x') {
      // Hex byte like \x89
      const hexValue = cleanString.substr(i + 2, 2);
      bytes.push(parseInt(hexValue, 16));
      i += 4; // Skip \x and 2 hex chars
    } else if (cleanString[i] === '\\' && cleanString[i + 1] === 'r') {
      bytes.push(13); // \r (carriage return)
      i += 2;
    } else if (cleanString[i] === '\\' && cleanString[i + 1] === 'n') {
      bytes.push(10); // \n (line feed)
      i += 2;
    } else {
      // Regular character
      bytes.push(cleanString.charCodeAt(i));
      i += 1;
    }
  }

  return new Uint8Array(bytes);
};

// Method 3: Create Blob from binary data
const createBlobFromBinary = (binaryData: Uint8Array, mimeType: string = 'image/png'): Blob => {
  return new Blob([binaryData], { type: mimeType });
};

// Method 4: Convert to Base64 for data URLs
const binaryToBase64 = (binaryData: Uint8Array): string => {
  const binaryString = Array.from(binaryData, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
};

// Method 5: Download binary file
const downloadBinaryFile = (binaryData: Uint8Array, filename: string, mimeType: string = 'image/png') => {
  const blob = createBlobFromBinary(binaryData, mimeType);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export default function FileConversion() {
  const [result, setResult] = useState<string>('');
  const [pythonInput, setPythonInput] = useState("b'\\x89PNG\\r\\n\\x1a\\n\\x00\\x00\\x00\\rIHDR'");

  const handleConvert = () => {
    try {
      // Convert Python bytes string to JavaScript
      const jsBytes = pythonBytesToJS(pythonInput);
      const base64 = binaryToBase64(jsBytes);

      setResult(`✅ Conversion successful!
Bytes: [${Array.from(jsBytes).join(', ')}]
Length: ${jsBytes.length} bytes
Base64: ${base64.substring(0, 50)}...
Data URL: data:image/png;base64,${base64}`);

      console.log('Converted bytes:', jsBytes);
      console.log('As array:', Array.from(jsBytes));
    } catch (error) {
      setResult(`❌ Error: ${(error as Error).message}`);
    }
  };

  const handleDownload = () => {
    try {
      const jsBytes = pythonBytesToJS(pythonInput);
      downloadBinaryFile(jsBytes, 'converted_file.png', 'image/png');
      setResult('📁 File downloaded as "converted_file.png"');
    } catch (error) {
      setResult(`❌ Download error: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Binary Data Conversion (Python bytes → JavaScript)</h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Python Bytes String:
        </label>
        <textarea
          value={pythonInput}
          onChange={(e) => setPythonInput(e.target.value)}
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            fontFamily: 'monospace',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          placeholder="Paste your Python bytes string here..."
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleConvert}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 Convert to JavaScript
        </button>

        <button
          onClick={handleDownload}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📁 Download as File
        </button>
      </div>

      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontSize: '14px'
        }}>
          <strong>Result:</strong>
          {'\n' + result}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
        <h3>📚 How it works:</h3>
        <ul>
          <li><code>b'...'</code> → Remove Python bytes wrapper</li>
          <li><code>\x89</code> → Convert hex to byte (0x89 = 137)</li>
          <li><code>\r</code> → Carriage return (13)</li>
          <li><code>\n</code> → Line feed (10)</li>
          <li>Result: <code>Uint8Array</code> for binary operations</li>
        </ul>

        <h4>Common Use Cases:</h4>
        <ul>
          <li>📷 Images (PNG, JPEG)</li>
          <li>📄 PDFs and documents</li>
          <li>🎵 Audio files</li>
          <li>🎬 Video files</li>
          <li>📦 Any binary file format</li>
        </ul>
      </div>
    </div>
  );
}