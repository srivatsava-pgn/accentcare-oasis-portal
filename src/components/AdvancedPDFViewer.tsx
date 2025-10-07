import React, { useEffect, useState } from 'react';
// @ts-expect-error - Components from submodule
import { PDFViewer, NERViewer } from '../lib/pdf-viewer';

interface AdvancedPDFViewerProps {
  documentData: any;
  boundingBoxes?: any;
  searchResults?: any;
  nerData?: any[];
  viewMode?: 'pdf' | 'ner';
  selectedDocument?: string;
  currentPage?: number;
  onDocumentChange?: (documentName: string) => void;
  onPageChange?: (pageNumber: number) => void;
  onAnnotationAdd?: (annotation: any) => void;
  onSearchPerformed?: (searchQuery: string) => Promise<void>;
  setSearchResults?: (results: any) => void;
}

const AdvancedPDFViewer: React.FC<AdvancedPDFViewerProps> = ({
  documentData,
  boundingBoxes,
  searchResults,
  nerData,
  viewMode = 'pdf',
  onDocumentChange,
  onPageChange,
  onAnnotationAdd,
  onSearchPerformed,
  setSearchResults
}) => {
  const [formattedDocumentData, setFormattedDocumentData] = useState<any>(null);

  // Transform the API response to match the expected format for the PDF viewer library
  useEffect(() => {
    if (documentData) {
      // Check if data is already in the correct format
      if (documentData.files && documentData.presigned_urls) {
        setFormattedDocumentData(documentData);
      } else if (documentData.documents) {
        // Transform from the old format to the new format
        const files = documentData.documents.map((doc: any) => doc.document_name);
        const presigned_urls: any = {};
        
        documentData.documents.forEach((doc: any) => {
          presigned_urls[doc.document_name] = {};
          if (doc.page_urls) {
            Object.entries(doc.page_urls).forEach(([pageNum, url]) => {
              presigned_urls[doc.document_name][pageNum] = url;
            });
          }
        });

        setFormattedDocumentData({
          files,
          presigned_urls
        });
      }
    }
  }, [documentData]);

  if (!formattedDocumentData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading document viewer...</p>
      </div>
    );
  }

  const userInterfaces = {
    docNavigation: true,
    zoom: true,
    download: true,
    keyboardShortcuts: viewMode === 'ner',
    showFilename: viewMode === 'ner'
  };

  return (
    <div className="h-full w-full">
      {viewMode === 'ner' && nerData ? (
        <NERViewer
          documentData={formattedDocumentData}
          nerData={nerData}
          userInterfaces={userInterfaces}
          onDocumentChange={onDocumentChange}
          onPageChange={onPageChange}
        />
      ) : (
        <PDFViewer
          documentData={formattedDocumentData}
          boundingBoxes={boundingBoxes}
          searchResults={searchResults}
          userInterfaces={userInterfaces}
          onDocumentChange={onDocumentChange}
          onPageChange={onPageChange}
          onAnnotationAdd={onAnnotationAdd}
          onSearchPerformed={onSearchPerformed}
          setSearchResults={setSearchResults}
        />
      )}
    </div>
  );
};

export default AdvancedPDFViewer;