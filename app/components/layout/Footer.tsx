export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-600 text-sm">
            © 2024 RAG Workflow. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
              Documentation
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
              API Reference
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
