"use client";

import { useState } from 'react';
import { getAuthHeaders } from '@/lib/auth';

interface ProductImageManagerProps {
  onImagesPopulated?: (count: number) => void;
}

export default function ProductImageManager({ onImagesPopulated }: ProductImageManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showManager, setShowManager] = useState(false);

  const populateImages = async () => {
    try {
      setIsLoading(true);
      setMessage('');

      const response = await fetch('/api/product-images/populate', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Successfully updated ${data.updatedCount} products with images`);
        onImagesPopulated?.(data.updatedCount);
      } else {
        setMessage(`❌ Failed to populate images: ${data.message}`);
      }
    } catch (error) {
      console.error('Error populating images:', error);
      setMessage('❌ Error populating images');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Product Image Manager
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage product images based on categories from Ressichem website
          </p>
        </div>
        <button
          onClick={() => setShowManager(!showManager)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          {showManager ? 'Hide' : 'Show'} Manager
        </button>
      </div>

      {showManager && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              🖼️ Image Categories Available
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800 dark:text-blue-200">
              <div>• Dry Mix Mortars</div>
              <div>• Epoxy Floorings</div>
              <div>• Building Care</div>
              <div>• Epoxy Adhesives</div>
              <div>• Tiling Materials</div>
              <div>• Concrete Admixtures</div>
              <div>• Building Insulation</div>
              <div>• Decorative Concrete</div>
              <div>• Specialty Products</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={populateImages}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-r-transparent mr-2"></div>
                  Populating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Populate Images
                </>
              )}
            </button>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              This will update all products with category-appropriate images from the Ressichem website.
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('✅') 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
