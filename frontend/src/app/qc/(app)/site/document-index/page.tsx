"use client";

import React, { useMemo, useState } from "react";
import { qcDocumentIndexApi } from "@/lib/qcSiteApi";
import { FileText, Search, PlusCircle, Tag, CalendarDays } from "lucide-react";

export default function DocumentIndexPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showIndexForm, setShowIndexForm] = useState(false);

  const [searchFilters, setSearchFilters] = useState({
    batchNumber: "",
    productName: "",
    grade: "",
    date: "",
    module: "",
    keyword: "",
    tags: [] as string[],
  });

  const [indexForm, setIndexForm] = useState({
    batchNumber: "",
    productName: "",
    grade: "",
    date: "",
    module: "",
    documentType: "",
    documentUrl: "",
    tags: [] as string[],
    metadata: {} as Record<string, any>,
  });

  const [tagInput, setTagInput] = useState("");
  const resultsCount = useMemo(() => searchResults.length, [searchResults]);

  const handleSearch = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await qcDocumentIndexApi.search({
        batchNumber: searchFilters.batchNumber || undefined,
        productName: searchFilters.productName || undefined,
        grade: searchFilters.grade || undefined,
        date: searchFilters.date || undefined,
        module: searchFilters.module || undefined,
        keyword: searchFilters.keyword || undefined,
        tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
      });
      if (res.success) {
        setSearchResults(res.data || []);
        setMessage(`Found ${res.data?.length || 0} documents`);
      } else {
        setMessage(res.message || "Search failed");
      }
    } catch (e: any) {
      setMessage(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleIndexDocument = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await qcDocumentIndexApi.indexDocument(indexForm);
      if (res.success) {
        setMessage("Document indexed successfully!");
        setShowIndexForm(false);
        setIndexForm({
          batchNumber: "",
          productName: "",
          grade: "",
          date: "",
          module: "",
          documentType: "",
          documentUrl: "",
          tags: [],
          metadata: {},
        });
        handleSearch(); // Refresh search results
      } else {
        setMessage(res.message || "Indexing failed");
      }
    } catch (e: any) {
      setMessage(e?.message || "Indexing failed");
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tagList: string[], setTagList: (tags: string[]) => void) => {
    if (tagInput.trim() && !tagList.includes(tagInput.trim())) {
      setTagList([...tagList, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string, tagList: string[], setTagList: (tags: string[]) => void) => {
    setTagList(tagList.filter((t) => t !== tag));
  };

  const getDocumentsByBatch = async (batchNumber: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await qcDocumentIndexApi.getByBatchNumber(batchNumber);
      if (res.success) {
        setSearchResults(res.data || []);
        setMessage(`Found ${res.data?.length || 0} documents for batch ${batchNumber}`);
      } else {
        setMessage(res.message || "Failed to fetch documents");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const getDocumentsByProduct = async (productName: string, grade?: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await qcDocumentIndexApi.getByProduct(productName, grade);
      if (res.success) {
        setSearchResults(res.data || []);
        setMessage(`Found ${res.data?.length || 0} documents for product ${productName}${grade ? ` (${grade})` : ""}`);
      } else {
        setMessage(res.message || "Failed to fetch documents");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Document Index</h2>
          <p className="text-sm text-white/80">SRS 3.6 - Document Management & Auto-Indexing</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/10 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Indexed documents
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 flex items-center gap-2">
              <Search className="h-3.5 w-3.5" /> Smart search
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" /> Tags & filters
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowIndexForm(!showIndexForm)}
          className="px-4 py-2 rounded-xl bg-white text-blue-900 text-sm font-semibold hover:bg-blue-50 flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          {showIndexForm ? "Cancel" : "Index New Document"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes("success") || message.includes("Found") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}

      {showIndexForm && (
        <div className="mb-6 rounded-3xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Index New Document</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">SRS 3.6.1 • Provide document metadata for fast retrieval</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number *</label>
              <input
                type="text"
                value={indexForm.batchNumber}
                onChange={(e) => setIndexForm({ ...indexForm, batchNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
              <input
                type="text"
                value={indexForm.productName}
                onChange={(e) => setIndexForm({ ...indexForm, productName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
              <input
                type="text"
                value={indexForm.grade}
                onChange={(e) => setIndexForm({ ...indexForm, grade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input
                type="date"
                value={indexForm.date}
                onChange={(e) => setIndexForm({ ...indexForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module *</label>
              <select
                value={indexForm.module}
                onChange={(e) => setIndexForm({ ...indexForm, module: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Module</option>
                <option value="RESIN_QC">Resin QC</option>
                <option value="HARDENER_QC">Hardener QC</option>
                <option value="LMS_QC">LMS QC</option>
                <option value="PACKAGING_MATERIAL_QC">Packaging Material QC</option>
                <option value="QA_BOTTLE_FILLING">QA Bottle Filling</option>
                <option value="RD_TRIAL_BATCH">R&D Trial Batch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type *</label>
              <input
                type="text"
                value={indexForm.documentType}
                onChange={(e) => setIndexForm({ ...indexForm, documentType: e.target.value })}
                placeholder="e.g., COA, Test Report, Certificate"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document URL *</label>
              <input
                type="url"
                value={indexForm.documentUrl}
                onChange={(e) => setIndexForm({ ...indexForm, documentUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(indexForm.tags, (tags) => setIndexForm({ ...indexForm, tags }));
                    }
                  }}
                  placeholder="Press Enter to add tag"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => addTag(indexForm.tags, (tags) => setIndexForm({ ...indexForm, tags }))}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
                >
                  <Tag className="h-4 w-4" />
                  Add Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {indexForm.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag, indexForm.tags, (tags) => setIndexForm({ ...indexForm, tags }))}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleIndexDocument}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Index Document
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-3xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Search Documents</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">SRS 3.6.2 • Filter by batch, product, module, and tags</p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {resultsCount} results
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number</label>
            <input
              type="text"
              value={searchFilters.batchNumber}
              onChange={(e) => setSearchFilters({ ...searchFilters, batchNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
            <input
              type="text"
              value={searchFilters.productName}
              onChange={(e) => setSearchFilters({ ...searchFilters, productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
            <input
              type="text"
              value={searchFilters.grade}
              onChange={(e) => setSearchFilters({ ...searchFilters, grade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={searchFilters.date}
              onChange={(e) => setSearchFilters({ ...searchFilters, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module</label>
            <select
              value={searchFilters.module}
              onChange={(e) => setSearchFilters({ ...searchFilters, module: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="RESIN_QC">Resin QC</option>
              <option value="HARDENER_QC">Hardener QC</option>
              <option value="LMS_QC">LMS QC</option>
              <option value="PACKAGING_MATERIAL_QC">Packaging Material QC</option>
              <option value="QA_BOTTLE_FILLING">QA Bottle Filling</option>
              <option value="RD_TRIAL_BATCH">R&D Trial Batch</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keyword</label>
            <input
              type="text"
              value={searchFilters.keyword}
              onChange={(e) => setSearchFilters({ ...searchFilters, keyword: e.target.value })}
              placeholder="Search in document content"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            onClick={() => {
              if (searchFilters.batchNumber) {
                getDocumentsByBatch(searchFilters.batchNumber);
              }
            }}
            disabled={loading || !searchFilters.batchNumber}
            className="px-4 py-2 rounded-xl bg-orange-700 text-white text-sm font-semibold hover:bg-orange-800 disabled:opacity-50"
          >
            Get by Batch Number
          </button>
          <button
            onClick={() => {
              if (searchFilters.productName) {
                getDocumentsByProduct(searchFilters.productName, searchFilters.grade || undefined);
              }
            }}
            disabled={loading || !searchFilters.productName}
            className="px-4 py-2 rounded-xl bg-orange-700 text-white text-sm font-semibold hover:bg-orange-800 disabled:opacity-50"
          >
            Get by Product
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Search Results ({resultsCount})
        </h3>
        {resultsCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-600 dark:text-gray-400">
            No documents yet. Run a search or index a new document to populate this list.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {searchResults.map((doc, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/40 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{doc.documentType || "Document"}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Batch: {doc.batchNumber} • Product: {doc.productName} {doc.grade ? `(${doc.grade})` : ""}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                    {doc.module || "N/A"}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  <strong>Date:</strong> {doc.date ? new Date(doc.date).toLocaleDateString() : "N/A"}
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.tags.map((tag: string, tagIdx: number) => (
                      <span
                        key={tagIdx}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {doc.documentUrl && (
                  <a
                    href={doc.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    View Document
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

