import React from 'react';
import { HelpCircle, Shield, FileText, MessageCircle, BookOpen } from 'lucide-react';

export default function HelpPage() {
  const supportCards = [
    {
      title: 'Help Center & Getting Started',
      description: 'Learn how to use AUROQI to lock files and generate secure links.',
      icon: BookOpen,
      action: 'Read Guides'
    },
    {
      title: 'Security Center',
      description: 'Deep dive into our zero-knowledge encryption architecture.',
      icon: Shield,
      action: 'View Security Specs'
    },
    {
      title: 'Release Notes',
      description: 'See what is new in the latest versions of AUROQI.',
      icon: FileText,
      action: 'View Changelog'
    },
    {
      title: 'Contact Support',
      description: 'Need help? Get in touch with our technical support team.',
      icon: MessageCircle,
      action: 'Open Ticket'
    },
    {
      title: 'Privacy Policy & Terms',
      description: 'Read our legal agreements and privacy policies.',
      icon: HelpCircle,
      action: 'View Legal'
    }
  ];

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Help & Support</h1>
        <p className="text-[15px] text-gray-500">Everything you need to master AUROQI and secure your files.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportCards.map((card, index) => (
          <button
            key={index}
            className="flex flex-col items-start text-left p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#0073bb] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-50 text-gray-400 group-hover:text-[#0073bb] group-hover:bg-blue-50 rounded-lg transition-colors">
                <card.icon size={24} />
              </div>
              <h2 className="text-[16px] font-bold text-gray-900">{card.title}</h2>
            </div>
            <p className="text-[14px] text-gray-500 mb-6 flex-1">
              {card.description}
            </p>
            <span className="text-[13px] font-bold text-[#0073bb] group-hover:text-[#00609a]">
              {card.action} &rarr;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
