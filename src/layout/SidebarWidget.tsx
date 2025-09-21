import React from "react";

export default function SidebarWidget() {
  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-blue-50 px-4 py-5 text-center dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}
    >
      <div className="mb-3">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>
      <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
        Shallow Bay Advisors
      </h3>
      <p className="mb-4 text-blue-700 text-sm dark:text-blue-300">
        Professional Commercial Real Estate CRM System
      </p>
      <div className="text-xs text-blue-600 dark:text-blue-400">
        Built for Excellence in Commercial Real Estate
      </div>
    </div>
  );
}
