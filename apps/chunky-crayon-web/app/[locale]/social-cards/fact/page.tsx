'use client';

import { useState } from 'react';
import { FactCard } from '@/components/social/FactCard';
import { FACT_CATEGORIES } from '@/lib/social/facts';

/**
 * Preview page for fact cards.
 * Used for development and testing before posting to social media.
 *
 * Access at: /social-cards/fact
 */
const BACKGROUND_OPTIONS = [
  { label: 'Cream', value: 0 },
  { label: 'Peach', value: 1 },
  { label: 'Mint', value: 2 },
  { label: 'Pink', value: 3 },
  { label: 'Lavender', value: 4 },
  { label: 'Yellow', value: 5 },
  { label: 'Random', value: -1 },
];

export default function FactCardPreviewPage() {
  const [fact, setFact] = useState(
    'Coloring helps children develop fine motor skills!',
  );
  const [category, setCategory] = useState('Coloring Benefit');
  const [emoji, setEmoji] = useState('🎨');
  const [format, setFormat] = useState<'square' | 'vertical'>('square');
  const [colorIndex, setColorIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateFact = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/social/fact-card/generate');
      const data = await response.json();
      if (data.fact) {
        setFact(data.fact.fact);
        setCategory(data.fact.category);
        setEmoji(data.fact.emoji);
      }
    } catch (error) {
      console.error('Failed to generate fact:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const cat = FACT_CATEGORIES.find((c) => c.name === newCategory);
    if (cat) {
      setEmoji(cat.emoji);
    }
  };

  const colorParam = colorIndex >= 0 ? `&colorIndex=${colorIndex}` : '';
  const renderUrl = `/api/social/fact-card/render?fact=${encodeURIComponent(fact)}&category=${encodeURIComponent(category)}&emoji=${encodeURIComponent(emoji)}&format=${format}${colorParam}`;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Fact Card Preview
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fact Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fact Text
              </label>
              <textarea
                value={fact}
                onChange={(e) => setFact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                maxLength={100}
              />
              <p className="text-sm text-gray-500 mt-1">
                {fact.length}/100 characters
              </p>
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {FACT_CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) =>
                  setFormat(e.target.value as 'square' | 'vertical')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="square">
                  Square (1080x1080) - Instagram/Facebook
                </option>
                <option value="vertical">
                  Vertical (1000x1500) - Pinterest
                </option>
              </select>
            </div>

            {/* Emoji Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emoji
              </label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                maxLength={4}
              />
            </div>

            {/* Background Color Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <select
                value={colorIndex}
                onChange={(e) => setColorIndex(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {BACKGROUND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateFact}
                disabled={isGenerating}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300 transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate AI Fact'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* HTML Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              HTML Preview
            </h2>
            <div
              className="border border-gray-200 rounded-lg overflow-hidden"
              style={{
                width: format === 'vertical' ? '333px' : '360px',
                height: format === 'vertical' ? '500px' : '360px',
              }}
            >
              <div
                style={{
                  transform:
                    format === 'vertical' ? 'scale(0.333)' : 'scale(0.333)',
                  transformOrigin: 'top left',
                }}
              >
                <FactCard
                  fact={fact}
                  category={category}
                  emoji={emoji}
                  format={format}
                  colorIndex={colorIndex >= 0 ? colorIndex : undefined}
                />
              </div>
            </div>
          </div>

          {/* Rendered Image Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Rendered Image Preview
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderUrl}
                alt="Rendered fact card"
                className="w-full h-auto"
                style={{
                  maxWidth: format === 'vertical' ? '333px' : '360px',
                }}
              />
            </div>
            <a
              href={renderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-orange-500 hover:text-orange-600 underline"
            >
              Open full-size image
            </a>
          </div>
        </div>

        {/* Download Links */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Download Links
          </h2>
          <div className="flex flex-wrap gap-4">
            <a
              href={`/api/social/fact-card/render?fact=${encodeURIComponent(fact)}&category=${encodeURIComponent(category)}&emoji=${encodeURIComponent(emoji)}&format=square${colorParam}`}
              download="fact-card-square.png"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Download Square (1080x1080)
            </a>
            <a
              href={`/api/social/fact-card/render?fact=${encodeURIComponent(fact)}&category=${encodeURIComponent(category)}&emoji=${encodeURIComponent(emoji)}&format=vertical${colorParam}`}
              download="fact-card-vertical.png"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Download Vertical (1000x1500)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
