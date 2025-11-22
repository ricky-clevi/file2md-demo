'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface ConversionResult {
  success: boolean;
  filename: string;
  hasImages: boolean;
  downloadUrl: string;
  error?: string;
  markdown?: string;
  imageCount?: number;
  chartCount?: number;
  metadata?: Record<string, unknown>;
  stats?: {
    inputBytes?: number;
    markdownBytes?: number;
    compressionRatio?: number | null;
    imageCount?: number;
    chartCount?: number;
    processingTimeMs?: number;
  };
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractImages, setExtractImages] = useState(true);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/x-hwp': ['.hwp'],
      'application/x-hwpx': ['.hwpx'],
      'application/x-cfb': ['.hwp']
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024
  });

  const handleConvert = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('preserveLayout', String(true));
    formData.append('extractImages', String(extractImages));
    formData.append('extractCharts', String(true));

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let serverMsg = response.statusText || 'Request failed';
        try {
          const maybeJson = await response.json();
          if (maybeJson && typeof maybeJson.error === 'string') {
            serverMsg = maybeJson.error;
          }
        } catch {
          // ignore JSON parse failure
        }
        throw new Error(serverMsg);
      }

      const data: ConversionResult = await response.json();
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (result?.downloadUrl) {
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const prettyBytes = (n?: number) => {
    if (!n && n !== 0) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resetForm = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--apple-background-secondary)' }}>
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in">
          <h1
            className="text-5xl md:text-6xl font-semibold mb-4"
            style={{
              color: 'var(--apple-foreground)',
              letterSpacing: '-0.02em',
              lineHeight: '1.05'
            }}
          >
            File2MD
          </h1>
          <p
            className="text-xl md:text-2xl mb-3"
            style={{
              color: 'var(--apple-foreground-secondary)',
              fontWeight: '400',
              letterSpacing: '-0.01em'
            }}
          >
            Convert documents to Markdown
          </p>
          <p
            className="text-base"
            style={{ color: 'var(--apple-foreground-secondary)' }}
          >
            Powered by{' '}
            <a
              href="https://www.npmjs.com/package/file2md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--apple-blue)' }}
            >
              file2md
            </a>
            {' '}npm package
          </p>
        </div>

        {/* Demo Environment Notice */}
        <div
          className="mb-8 p-5 rounded-2xl animate-slide-in"
          style={{
            background: 'var(--apple-background)',
            border: '1px solid var(--apple-separator)',
            boxShadow: 'var(--apple-shadow-sm)'
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-6 h-6 mt-0.5"
              style={{ color: 'var(--apple-blue)' }}
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3
                className="text-base font-semibold mb-2"
                style={{ color: 'var(--apple-foreground)' }}
              >
                Demo Environment
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--apple-foreground-secondary)' }}
              >
                This demo runs in a serverless environment. Image previews are not available in the web interface,
                but all images are included in the downloadable ZIP file. For full image preview capabilities,
                run file2md locally or in a traditional server environment.
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div
          className="p-8 md:p-12 rounded-3xl mb-12 animate-slide-in"
          style={{
            background: 'var(--apple-background)',
            border: '1px solid var(--apple-separator)',
            boxShadow: 'var(--apple-shadow-md)'
          }}
        >
          {!result ? (
            <>
              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive ? 'scale-[1.02]' : selectedFile ? '' : 'hover:scale-[1.01]'
                }`}
                style={{
                  borderColor: isDragActive
                    ? 'var(--apple-blue)'
                    : selectedFile
                    ? 'var(--apple-green)'
                    : 'var(--apple-separator)',
                  background: isDragActive
                    ? 'rgba(0, 122, 255, 0.05)'
                    : selectedFile
                    ? 'rgba(52, 199, 89, 0.05)'
                    : 'transparent'
                }}
              >
                <input {...getInputProps()} />
                <div className="space-y-6">
                  <div
                    className="mx-auto w-20 h-20"
                    style={{
                      color: selectedFile
                        ? 'var(--apple-green)'
                        : 'var(--apple-foreground-secondary)'
                    }}
                  >
                    {selectedFile ? (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                    )}
                  </div>
                  {selectedFile ? (
                    <div className="space-y-2">
                      <p
                        className="text-lg font-medium"
                        style={{ color: 'var(--apple-green)' }}
                      >
                        File selected
                      </p>
                      <p
                        className="text-base font-medium"
                        style={{ color: 'var(--apple-foreground)' }}
                      >
                        {selectedFile.name}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--apple-foreground-secondary)' }}
                      >
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p
                        className="text-xl font-medium"
                        style={{ color: 'var(--apple-foreground)' }}
                      >
                        {isDragActive ? 'Drop your file here' : 'Drag and drop a file'}
                      </p>
                      <p
                        className="text-base"
                        style={{ color: 'var(--apple-foreground-secondary)' }}
                      >
                        or click to browse
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--apple-gray)' }}
                      >
                        PDF, DOCX, XLSX, PPTX, HWP, HWPX · Max 50MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="mt-8">
                <label
                  className="inline-flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    background: extractImages ? 'var(--apple-background-secondary)' : 'transparent',
                    border: '1px solid var(--apple-separator)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={extractImages}
                    onChange={e => setExtractImages(e.target.checked)}
                    className="w-5 h-5 rounded accent-blue-500"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <span
                    className="text-base font-medium"
                    style={{ color: 'var(--apple-foreground)' }}
                  >
                    Extract images
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
                {selectedFile && (
                  <button
                    onClick={resetForm}
                    className="apple-button px-8 py-3.5 rounded-full text-base font-medium transition-all"
                    style={{
                      background: 'var(--apple-background-secondary)',
                      color: 'var(--apple-foreground)',
                      border: '1px solid var(--apple-separator)'
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleConvert}
                  disabled={!selectedFile || isConverting}
                  className="apple-button px-10 py-3.5 rounded-full text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: !selectedFile || isConverting ? 'var(--apple-gray-light)' : 'var(--apple-blue)',
                    color: !selectedFile || isConverting ? 'var(--apple-gray)' : '#FFFFFF',
                    boxShadow: !selectedFile || isConverting ? 'none' : 'var(--apple-shadow)'
                  }}
                >
                  {isConverting ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Converting...
                    </span>
                  ) : (
                    'Convert to Markdown'
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div
                  className="mt-8 p-5 rounded-2xl"
                  style={{
                    background: 'rgba(255, 59, 48, 0.1)',
                    border: '1px solid rgba(255, 59, 48, 0.2)'
                  }}
                >
                  <div className="flex gap-4">
                    <div
                      className="flex-shrink-0 w-6 h-6"
                      style={{ color: 'var(--apple-red)' }}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3
                        className="text-base font-semibold mb-1"
                        style={{ color: 'var(--apple-red)' }}
                      >
                        Conversion Error
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--apple-foreground-secondary)' }}
                      >
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Success Result */
            <div className="space-y-8">
              <div
                className="mx-auto w-20 h-20"
                style={{ color: 'var(--apple-green)' }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="text-center">
                <h2
                  className="text-3xl font-semibold mb-3"
                  style={{ color: 'var(--apple-foreground)' }}
                >
                  Conversion Successful
                </h2>
                <p
                  className="text-lg"
                  style={{ color: 'var(--apple-foreground-secondary)' }}
                >
                  Your file has been converted to Markdown{result.hasImages && ' with extracted images'}.
                </p>
                {result.hasImages && (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: 'var(--apple-orange)' }}
                  >
                    Images are included in the ZIP download but not visible in this serverless preview.
                  </p>
                )}
              </div>

              {/* File Details */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--apple-background-secondary)',
                  border: '1px solid var(--apple-separator)'
                }}
              >
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: 'var(--apple-foreground)' }}
                >
                  File Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p style={{ color: 'var(--apple-foreground-secondary)' }}>File</p>
                    <p
                      className="font-medium mt-1"
                      style={{ color: 'var(--apple-foreground)' }}
                    >
                      {result.filename}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--apple-foreground-secondary)' }}>Output</p>
                    <p
                      className="font-medium mt-1"
                      style={{ color: 'var(--apple-foreground)' }}
                    >
                      {result.hasImages ? 'ZIP (Markdown + Images)' : 'Markdown'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--apple-foreground-secondary)' }}>Images</p>
                    <p
                      className="font-medium mt-1"
                      style={{ color: 'var(--apple-foreground)' }}
                    >
                      {result.imageCount ?? (result.hasImages ? 'yes' : 'no')}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--apple-foreground-secondary)' }}>Charts</p>
                    <p
                      className="font-medium mt-1"
                      style={{ color: 'var(--apple-foreground)' }}
                    >
                      {result.chartCount ?? 0}
                    </p>
                  </div>
                  {result.stats && (
                    <>
                      <div>
                        <p style={{ color: 'var(--apple-foreground-secondary)' }}>Input size</p>
                        <p
                          className="font-medium mt-1"
                          style={{ color: 'var(--apple-foreground)' }}
                        >
                          {prettyBytes(result.stats.inputBytes)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--apple-foreground-secondary)' }}>Markdown size</p>
                        <p
                          className="font-medium mt-1"
                          style={{ color: 'var(--apple-foreground)' }}
                        >
                          {prettyBytes(result.stats.markdownBytes)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Markdown Preview */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'var(--apple-background-secondary)',
                  border: '1px solid var(--apple-separator)'
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--apple-foreground)' }}
                  >
                    Markdown Preview
                  </h3>
                  <button
                    onClick={handleDownload}
                    className="apple-button px-5 py-2 rounded-full text-sm font-medium"
                    style={{
                      background: 'var(--apple-green)',
                      color: '#FFFFFF',
                      boxShadow: 'var(--apple-shadow-sm)'
                    }}
                  >
                    Download {result.hasImages ? 'ZIP' : 'Markdown'}
                  </button>
                </div>
                <div
                  className="prose max-w-none text-left p-6 rounded-xl max-h-[500px] overflow-auto"
                  style={{
                    background: 'var(--apple-background)',
                    border: '1px solid var(--apple-separator)'
                  }}
                >
                  <ErrorBoundary
                    fallback={
                      <div
                        className="p-5 rounded-xl"
                        style={{
                          background: 'rgba(255, 149, 0, 0.1)',
                          border: '1px solid rgba(255, 149, 0, 0.2)'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            style={{ color: 'var(--apple-orange)' }}
                          >
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p
                              className="text-sm font-medium mb-3"
                              style={{ color: 'var(--apple-foreground)' }}
                            >
                              Error rendering markdown preview. The file was converted successfully, but some content cannot be displayed.
                            </p>
                            <button
                              onClick={handleDownload}
                              className="apple-button text-sm px-4 py-2 rounded-lg font-medium"
                              style={{
                                background: 'var(--apple-orange)',
                                color: '#FFFFFF'
                              }}
                            >
                              Download Markdown File
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                       img: ({...props }) => (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img
                           src={props.src as string}
                           style={{
                             maxWidth: '100%',
                             height: 'auto',
                             marginBottom: '1rem',
                             border: '1px solid var(--apple-separator)',
                             borderRadius: 'var(--apple-radius-sm)',
                             background: 'var(--apple-background-secondary)'
                           }}
                           onLoad={(e) => {
                             (e.target as HTMLImageElement).style.background = 'transparent';
                           }}
                           onError={(e) => {
                             const img = e.target as HTMLImageElement;
                             img.style.display = 'none';
                             const fallback = document.createElement('div');
                             fallback.textContent = `[Image: ${props.alt || 'Unable to load image'}]`;
                             fallback.style.cssText = 'color: var(--apple-foreground-secondary); font-style: italic; padding: 12px; border: 1px dashed var(--apple-separator); border-radius: 8px; margin-bottom: 1rem;';
                             img.parentNode?.insertBefore(fallback, img.nextSibling);
                           }}
                           alt={props.alt || 'Image from Markdown conversion'}
                           loading="lazy"
                         />
                       )
                      }}
                    >
                      {result.markdown || ''}
                    </ReactMarkdown>
                  </ErrorBoundary>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={resetForm}
                  className="apple-button px-8 py-3.5 rounded-full text-base font-medium"
                  style={{
                    background: 'var(--apple-background-secondary)',
                    color: 'var(--apple-foreground)',
                    border: '1px solid var(--apple-separator)'
                  }}
                >
                  Convert Another File
                </button>
                <button
                  onClick={handleDownload}
                  className="apple-button px-10 py-3.5 rounded-full text-base font-semibold"
                  style={{
                    background: 'var(--apple-green)',
                    color: '#FFFFFF',
                    boxShadow: 'var(--apple-shadow)'
                  }}
                >
                  Download {result.hasImages ? 'ZIP' : 'Markdown'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Package Info & Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* About file2md */}
          <div
            className="p-8 rounded-3xl animate-slide-in"
            style={{
              background: 'var(--apple-background)',
              border: '1px solid var(--apple-separator)',
              boxShadow: 'var(--apple-shadow)'
            }}
          >
            <h3
              className="text-2xl font-semibold mb-4"
              style={{
                color: 'var(--apple-foreground)',
                letterSpacing: '-0.01em'
              }}
            >
              About file2md
            </h3>
            <p
              className="text-base leading-relaxed mb-6"
              style={{ color: 'var(--apple-foreground-secondary)' }}
            >
              A powerful npm package that converts various document formats into clean, structured Markdown with image extraction and layout preservation.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Text extraction with formatting',
                'Image and chart extraction',
                'Layout preservation options',
                'Multiple output formats'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(52, 199, 89, 0.15)' }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      style={{ color: 'var(--apple-green)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span
                    className="text-base"
                    style={{ color: 'var(--apple-foreground)' }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--apple-background-secondary)' }}
            >
              <p
                className="text-sm mb-2"
                style={{ color: 'var(--apple-foreground-secondary)' }}
              >
                Installation
              </p>
              <code
                className="text-sm font-mono"
                style={{ color: 'var(--apple-foreground)' }}
              >
                npm install file2md
              </code>
            </div>

            <div className="mt-6">
              <a
                href="https://www.npmjs.com/package/file2md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-base font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--apple-blue)' }}
              >
                View on npm
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Supported Formats */}
          <div
            className="p-8 rounded-3xl animate-slide-in"
            style={{
              background: 'var(--apple-background)',
              border: '1px solid var(--apple-separator)',
              boxShadow: 'var(--apple-shadow)'
            }}
          >
            <h3
              className="text-2xl font-semibold mb-6"
              style={{
                color: 'var(--apple-foreground)',
                letterSpacing: '-0.01em'
              }}
            >
              Supported Formats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'PDF', desc: 'Portable Document', icon: '📄' },
                { name: 'DOCX', desc: 'Word Document', icon: '📝' },
                { name: 'XLSX', desc: 'Excel Spreadsheet', icon: '📊' },
                { name: 'PPTX', desc: 'PowerPoint', icon: '📽️' },
                { name: 'HWP', desc: 'Hangul Document', icon: '🇰🇷' },
                { name: 'HWPX', desc: 'Hangul XML', icon: '📋' }
              ].map(format => (
                <div
                  key={format.name}
                  className="p-5 rounded-2xl text-center transition-all hover:scale-105"
                  style={{
                    background: 'var(--apple-background-secondary)',
                    border: '1px solid var(--apple-separator)'
                  }}
                >
                  <div className="text-3xl mb-3">{format.icon}</div>
                  <div
                    className="font-semibold text-base mb-1"
                    style={{ color: 'var(--apple-foreground)' }}
                  >
                    {format.name}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--apple-foreground-secondary)' }}
                  >
                    {format.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center py-8"
          style={{ color: 'var(--apple-foreground-secondary)' }}
        >
          <p className="text-sm">
            Built with{' '}
            <a
              href="https://www.npmjs.com/package/file2md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--apple-blue)' }}
            >
              file2md
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
