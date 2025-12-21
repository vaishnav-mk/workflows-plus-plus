"use client";

import { Alert, AlertTitle, CrossHatchBackground } from "@/components";
import { Zap, Info, Check, Shield } from "lucide-react";
import { REQUIRED_PERMISSIONS } from "@/config/setup";

export function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          What is Cloudflare Workflows?
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          A visual workflow builder to create, deploy, and manage serverless
          applications on Cloudflare's edge network using drag-and-drop
          interfaces.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-600" />
          Capabilities
        </h3>
        <ul className="space-y-1.5 text-gray-600 text-sm">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Visual drag-and-drop workflow builder</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Deploy as optimized Cloudflare Workers</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>
              Integrate with D1, KV, and other Cloudflare products
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-600" />
          Why API Keys?
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-3">
          Cloudflare doesn't support OAuth. API tokens provide secure, scoped
          access to your resources.
        </p>
        <Alert>
          <AlertTitle className="text-sm">Security</AlertTitle>
          <p className="text-xs text-gray-600 mt-1">
            Your API token is stored in your browser and attached to requests.
            This is open source -{" "}
            <a
              href="https://github.com/vaishnav-mk/workflows-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              view the code
            </a>
            .
          </p>
        </Alert>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Required Permissions
        </h3>
        <div className="space-y-1.5">
          {REQUIRED_PERMISSIONS.map((perm, idx) => (
            <div
              key={idx}
              className="p-2 bg-gray-50 rounded border border-gray-200 relative overflow-hidden"
            >
              <CrossHatchBackground pattern="small" opacity={0.02} />
              <div className="flex items-center gap-2 relative z-10">
                <Shield className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-xs">
                    {perm.permission}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-tight">
                    {perm.reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

